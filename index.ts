import { app } from './app';
import { getClient, getPokemon, setPlayers, setPokemon } from './data_access';
import { Player, DetailedPokemon, NonDetailedPokemon } from './interfaces';

app.listen(app.get("port"), async () => {
    await getClient().connect();
    setPlayers(await getClient()
        .db("test")
        .collection("players")
        .find<Player>({})
        .toArray());
    setPokemon(await getClient()
        .db("test")
        .collection("pokemon")
        .find<DetailedPokemon>({})
        .toArray());
    if (getPokemon().length === 0) {
        const apiResult = await (await fetch("https://pokeapi.co/api/v2/pokemon?limit=151")).json();
        const promisePerPokemon: Promise<Response>[] = (apiResult.results as NonDetailedPokemon[]).map(({ url }) => fetch(url));
        const jsons = (await Promise.all(promisePerPokemon)).map((response) => response.json());
        const pokemon: DetailedPokemon[] = (await Promise.all(jsons)).map((singlePokemon) => {
            return {
                id: singlePokemon.id,
                name: singlePokemon.name,
                types: singlePokemon.types.map((slotAndType: any) => slotAndType.type.name),
                image: singlePokemon.sprites.front_default,
                height: singlePokemon.height,
                weight: singlePokemon.weight,
                maxHP: singlePokemon.stats[0].base_stat,
            }
        });
        await getClient().db("test").collection("pokemon").insertMany(pokemon);
        setPokemon(pokemon);
    }
    console.log(`Local url: http://localhost:${app.get("port")}`);
});
