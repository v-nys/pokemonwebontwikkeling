import { Player, DetailedPokemon } from './interfaces';
import { MongoClient } from "mongodb";
import 'dotenv/config';
import { exit } from 'process';

const mongoUser = process.env.MONGO_USER;
const mongoPassword = process.env.MONGO_PWD;
const mongoCluster = process.env.MONGO_CLUSTER;
if (!mongoUser || !mongoPassword || !mongoCluster) {
    console.log("Mongo credentials zijn niet in orde.");
    exit(1);
}

let localPlayers: Player[] = [];
let genOne: DetailedPokemon[] = [];
const uri = `mongodb+srv://${mongoUser}:${mongoPassword}@${mongoCluster}/?retryWrites=true&w=majority`;
let client = new MongoClient(uri);

export function getClient() {
    return client;
}

export function setClient(newClient: MongoClient) {
    client = newClient;
}

export function getPlayers(): Player[] {
    return localPlayers;
}

export function setPlayers(players: Player[]) {
    localPlayers = players;
}

export function getPokemon(): DetailedPokemon[] {
    return genOne;
}

export function setPokemon(pokemon: DetailedPokemon[]) {
    genOne = pokemon.sort((a, b) => a.id - b.id);
}

// export { client };