import { ObjectId } from "mongodb";

export interface Player {
    _id?: ObjectId,
    name: string,
    id: number,
    team: PlayerPokemon[],
    password: string,
}

export interface NonDetailedPokemon {
    name: string,
    url: string,
}

export interface DetailedPokemon {
    _id?: ObjectId,
    id: number,
    name: string,
    types: string[],
    image: string,
    height: number,
    weight: number,
    maxHP: number,
}

export interface PlayerPokemon extends DetailedPokemon {
    currentHP: number,
}