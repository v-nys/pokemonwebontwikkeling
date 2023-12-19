import express, { NextFunction } from "express";

import cookieParser from "cookie-parser";
import * as jwt from 'jsonwebtoken';
import { Player, DetailedPokemon, NonDetailedPokemon, PlayerPokemon } from './interfaces';
import { getPlayers, getPokemon, setPlayers, setPokemon, getClient } from './data_access';
import 'dotenv/config';
import { exit } from "process";

const app = express();
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    console.log("JWT secret ontbreekt.");
    exit(1);
}

const portAsString = process.env.PORT;
if (!portAsString) {
    console.log("Port ontbreekt.");
    exit(1);
}

const port = parseInt(portAsString);
if (!port) {
    console.log("Port is ongeldig.");
    exit(1);
}

const secureAsString = process.env.SECURE;
if (!secureAsString || secureAsString !== "0" && secureAsString !== "1") {
    console.log("Setting HTTPS ontbreekt / is ongeldig.");
    exit(1);
}
const secure = secureAsString === "1";


app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.set("view engine", "ejs");
app.set("port", port);
app.use(cookieParser());

function asyncHandler(fn: (req: any, res: any, next: NextFunction) => Promise<any>): any {
    return (req: any, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

app.get("/", (req, res) => {
    const tokenValue = req.cookies.jwt;
    if (tokenValue) {
        jwt.verify(tokenValue, jwtSecret, (err: any, player: any) => {
            if (err) {
                res.clearCookie("jwt");
                res.sendStatus(500);
            }
            else {
                res.redirect(`/player`);
            }
        });
    }
    else {
        res.render("index", { players: getPlayers() });
    }
});

app.get("/forgetme", (req, res) => {
    res.clearCookie("jwt");
    res.redirect("/");
});

app.post("/createPlayer", (req, res) => {
    const newPlayerId = getPlayers().reduce((acc, player) => {
        if (player.id >= acc) {
            return player.id + 1;
        }
        else {
            return acc;
        }
    }, 1);
    const newPlayer: Player = {
        name: req.body.name,
        password: req.body.password,
        id: newPlayerId,
        team: []
    };
    getPlayers().push(newPlayer);
    getClient().db("test").collection("players").insertOne(newPlayer);
    res.redirect("/");
});

app.post("/login", (req, res) => {
    const id = parseInt(req.body.id);
    const password = req.body.password;
    if (id && password) {
        const player = getPlayers().find((player) => player.id === id);
        if (player) {
            if (player.password === password) {
                // deze werkwijze toepassen waar je informatie opslaat
                const token = jwt.sign(player, jwtSecret);
                res.cookie("jwt", token, { maxAge: 900000, httpOnly: true, secure })
                res.redirect("/");
            }
            else {
                res.sendStatus(403);
            }
        }
        else {
            res.sendStatus(403);
        }
    }
    else {
        res.sendStatus(500);
    }

});

app.get("/player", (req, res) => {
    const tokenValue = req.cookies.jwt;
    if (tokenValue) {
        jwt.verify(tokenValue, jwtSecret, (err: any, player: any) => {
            if (err) {
                res.clearCookie("jwt");
                res.sendStatus(500);
            }
            else {
                res.render("player", { player });
            }
        });
    }
    else {
        res.sendStatus(500);
    }
});

app.get("/player/pokemon", (req, res) => {
    const tokenValue = req.cookies.jwt;
    if (tokenValue) {
        jwt.verify(tokenValue, jwtSecret, (err: any, player: any) => {
            if (err) {
                res.clearCookie("jwt");
                res.sendStatus(500);
            }
            else {
                res.render("pokemon", { genOne: getPokemon(), player });
            }
        });
    }
    else {
        res.sendStatus(500);
    }
});

app.post("/player/save", (req, res) => {
    const tokenValue = req.cookies.jwt;
    if (tokenValue) {
        jwt.verify(tokenValue, jwtSecret, (err: any, player: any) => {
            if (err) {
                res.clearCookie("jwt");
                res.sendStatus(500);
            }
            else {
                getClient().db("test")
                    .collection("players")
                    .updateOne({ id: player.id }, { $set: { team: player.team } });
                res.redirect("/player/");
            }
        });
    }
    else {
        res.sendStatus(500);
    }
});

app.post("/player/pokemon/add/:pokeId", (req, res) => {
    const tokenValue = req.cookies.jwt;
    if (tokenValue) {
        jwt.verify(tokenValue, jwtSecret, (err: any, player: any) => {
            if (err) {
                res.clearCookie("jwt");
                res.sendStatus(500);
            }
            else {
                const pokeId = parseInt(req.params.pokeId);
                const mon = getPokemon().find(({ id }) => pokeId === id);
                if (mon) {
                    if (player.team.length === 6) {
                        player.team.shift();
                    }
                    const currentHP = Math.floor(Math.random() * mon.maxHP + 1);
                    player.team.push({ ...mon, currentHP });
                    const token = jwt.sign(player, jwtSecret);
                    res.cookie("jwt", token, { maxAge: 900000, httpOnly: true, secure });
                    res.redirect("/player/pokemon")
                }
                else {
                    res.sendStatus(404);
                }
            }
        });
    }
    else {
        res.sendStatus(500);
    }
});

app.post("/player/pokemon/delete/:pokeId", (req, res) => {
    const tokenValue = req.cookies.jwt;
    if (tokenValue) {
        jwt.verify(tokenValue, jwtSecret, (err: any, player: any) => {
            if (err) {
                res.clearCookie("jwt");
                res.sendStatus(500);
            }
            else {
                let knownPlayer: Player = player;
                const pokeId = parseInt(req.params.pokeId);
                const monIndex = knownPlayer.team.findIndex(({ id }) => pokeId === id);
                if (monIndex >= 0) {
                    console.log("pokemon is gevonden in het team");
                    knownPlayer.team.splice(monIndex, 1);
                    const token = jwt.sign(knownPlayer, jwtSecret);
                    res.cookie("jwt", token, { maxAge: 900000, httpOnly: true, secure });
                    res.redirect("/player/pokemon")
                }
                else {
                    res.sendStatus(500);
                }
            }
        });
    }
});

app.use((req, res) => {
    res.status(404);
    res.send("Pagina kon niet gevonden worden.");
});

app.use((err: Error, req: any, res:any, next: NextFunction): any => {
    console.error(err);
    res.status(500).send({ errors: [{ message: "Something went wrong" }] });
});

export { app };