import { setPokemon, setPlayers, getPlayers, setClient, getClient, getPokemon } from "./data_access";
import request from 'supertest';
import { app } from './app';
import { Cookie, CookieAccessInfo } from 'cookiejar';
import { Player } from "./interfaces";
import { sign } from "jsonwebtoken";

const JWT_SECRET = "my secret key";

beforeEach(() => {
    setPokemon([
        { id: 4, name: "charmander", height: 6, weight: 85, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png", maxHP: 39, types: ["fire"] },
        { id: 5, name: "charmeleon", height: 6, weight: 85, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png", maxHP: 39, types: ["fire"] }
    ]);
    setPlayers([
        {
            name: "RED", id: 1, password: "maandag", team: [
                { id: 4, name: "charmander", height: 6, weight: 85, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png", currentHP: 30, maxHP: 39, types: ["fire"] },
                { id: 5, name: "charmeleon", height: 6, weight: 85, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png", currentHP: 30, maxHP: 39, types: ["fire"] }
            ]
        },
        {
            name: "BLUE", id: 2, password: "dinsdag", team: [
                { id: 4, name: "charmander", height: 6, weight: 85, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png", currentHP: 30, maxHP: 39, types: ["fire"] },
                { id: 5, name: "charmeleon", height: 6, weight: 85, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png", currentHP: 30, maxHP: 39, types: ["fire"] }
            ]
        }
    ]);
});

describe('GET /', () => {
    it('should return a page containing two forms when there is no session', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toContain(`form action="/createPlayer" method="POST"`);
        expect(response.text).toContain(`form action="/login" method="post"`);
        expect(response.text).toContain(`RED`);
        expect(response.text).toContain(`BLUE`);
    });
});

describe('POST /createPlayer', () => {
    it('should create a new player and redirect if all data are filled out correctly', async () => {
        const fakeClient = {
            db: jest.fn().mockReturnThis(),
            collection: jest.fn().mockReturnThis(),
            insertOne: jest.fn()
        };
        setClient(fakeClient as any);
        const response = await request(app).post('/createPlayer').send({ name: "GREEN", password: "woensdag" });
        expect(response.status).toBe(302);
        expect(getPlayers()).toContainEqual({ name: "GREEN", password: "woensdag", team: [], id: 3 });
        expect(fakeClient.insertOne).toHaveBeenCalledTimes(1);
        expect(fakeClient.insertOne).toHaveBeenCalledWith({ name: "GREEN", password: "woensdag", team: [], id: 3 });
    });
});

function playerToToken(player: Player) {
    return sign(player, JWT_SECRET);
}

describe('POST /player/pokemon/add/:pokeId', () => {
    it('should update the JWT token with one new Pokémon of the supplied type', async () => {
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiR1JFRU4iLCJwYXNzd29yZCI6IndvZW5zZGFnIiwidGVhbSI6W10sImlkIjo1fQ.FEG9VbWsPrKC5lhlzAWKvMCUOgf9xHWlkuu2m1eksM8";
        const agent = request.agent(app);
        agent.jar.setCookie(`jwt=${token}`);
        const response = await agent.post('/player/pokemon/add/5').send({ pokeId: 5 });
        const jwtCookie = agent.jar.getCookie('jwt', CookieAccessInfo.All);
        expect(jwtCookie).toBeDefined();
        // as Cookie omdat ik uit vorige expect weet dat jwtCookie defined moet zijn
        const cookieString = (jwtCookie as Cookie).toValueString();
        const payloadSubstring = getBase64PayloadFromJWT(cookieString);
        let base64Text = payloadSubstring;
        let player = JSON.parse(Buffer.from(base64Text, 'base64').toString());
        let firstPokemon = player.team[0];
        firstPokemon.currentHP = undefined;
        expect(firstPokemon).toEqual(getPokemon()[1]);
        expect(response.status).toBe(302);
    })
});

describe('POST /player/pokemon/delete/:pokeId', () => {
    it('should update the JWT token so that Pokémon is no longer included', async () => {
        // RED heeft Charmander (4) en Charmeleon (5)
        const token = playerToToken(getPlayers()[0]);
        const agent = request.agent(app);
        agent.jar.setCookie(`jwt=${token}`);
        const response = await agent.post('/player/pokemon/delete/4').send();
        const jwtCookie = agent.jar.getCookie('jwt', CookieAccessInfo.All);
        expect(jwtCookie).toBeDefined();
        // as Cookie omdat ik uit vorige expect weet dat jwtCookie defined moet zijn
        const cookieString = (jwtCookie as Cookie).toValueString();
        const payloadSubstring = getBase64PayloadFromJWT(cookieString);
        let base64Text = payloadSubstring;
        let player = JSON.parse(Buffer.from(base64Text, 'base64').toString());
        expect(player.team).toHaveLength(1);
        expect(player.team[0].name).toBe("charmeleon");
        expect(response.status).toBe(302);
    })
});

function getBase64PayloadFromJWT(cookieString: string) {
    const firstDotIndex = cookieString.indexOf(".");
    const secondDotIndex = cookieString.indexOf(".", firstDotIndex + 1);
    const payloadSubstring = cookieString.substring(firstDotIndex + 1, secondDotIndex);
    return payloadSubstring;
}

describe('POST /player/save', () => {
    it('should save the player currently stored in the JWT cookie to MongoDB', async () => {
        const fakeClient = {
            db: jest.fn().mockReturnThis(),
            collection: jest.fn().mockReturnThis(),
            updateOne: jest.fn()
        };
        setClient(fakeClient as any);
        // made with jwt.io
        // contains payload { name: "GREEN", password: "woensdag", team: [], id: 3 }
        // uses same secret as application code
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiR1JFRU4iLCJwYXNzd29yZCI6IndvZW5zZGFnIiwidGVhbSI6W10sImlkIjozfQ.vErBmolplnqVJ0aJKfYFadIGmsiEzro6SU2Ari-UBqI";
        const response = await request(app).post('/player/save').set("Cookie", [`jwt=${token}`]).send();
        expect(response.status).toBe(302);
        expect(fakeClient.updateOne).toHaveBeenCalledTimes(1);
        // toHaveBeenCalledWith controleert op inhoudelijke equality, niet op objectidentiteit
        expect(fakeClient.updateOne).toHaveBeenCalledWith({ id: 3 }, { $set: { team: [] } });
    });
    it('should clear invalid JWT cookies', async () => {
        // made with jwt.io
        // contains payload { name: "GREEN", password: "woensdag", team: [], id: 3 }
        // uses different secret than application code
        const agent = request.agent(app);
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiR1JFRU4iLCJwYXNzd29yZCI6IndvZW5zZGFnIiwidGVhbSI6W10sImlkIjo1fQ.mGF2m5iC_GD_9eG3MWpGjjn_iMg1frdrKBUfLFVGe7c";
        agent.jar.setCookie(`jwt=${token}`);
        const response = await agent.post('/player/save').send();
        expect(response.status).toBe(500);
        const jwtCookie = agent.jar.getCookie('jwt', CookieAccessInfo.All);
        expect(jwtCookie).toBeUndefined();
    });
});