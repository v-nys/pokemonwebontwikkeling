import { Builder, Browser, By, Key, until } from "selenium-webdriver";
import { getClient, setPlayers, getPlayers } from "./data_access";

(async function main() {
  await getClient().connect();
  await getClient().db("test").collection("players").deleteMany({});
  setPlayers([]);
  let driver = await new Builder().forBrowser(Browser.FIREFOX).build();
  try {
    await driver.get('http://localhost:3000/');
    // nieuwe speler aanmaken
    await driver.findElement(By.name('name')).sendKeys(Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, 'ORANGE');
    await driver.findElement(By.name('password')).sendKeys("woensdag", Key.RETURN);
    await driver.sleep(500);
    // inloggen als deze speler
    await driver.findElement(By.id('login-password')).sendKeys("woensdag", Key.RETURN);
    await driver.sleep(500);
    // MANAGE aanklikken
    await driver.findElement(By.id('manage-button')).click();
    await driver.sleep(500);
    // bulbasaur, ivysaur, venusaur, charmander, charmeleon, charizard, squirtle, wartortle toevoegen
    for (let pokemonId = 1; pokemonId <= 8; pokemonId++) {
        await driver.findElement(By.id(`add-pokemon-${pokemonId}`)).click();
        await driver.sleep(500);
    }
    // checken welke er staan kan via de afbeeldingen
    let spriteUrls = await Promise.all((await driver.findElements(By.css(".sprite"))).map(elem => elem.getAttribute("src")));
    if (!spriteUrls.includes("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/8.png")) {
        console.log("wartortle ontbreekt!");
    }
    if (spriteUrls.includes("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png")) {
        console.log("bulbasaur is er nog!");
    }
    // ga terug om te saven
    await driver.findElement(By.id("back-button")).click();
    await driver.sleep(500);
    await driver.findElement(By.id("save-button")).click();
    await driver.sleep(500);
    /*const jwt = await driver.manage().getCookie("jwt");
    console.debug(jwt);*/
    // log uit en log dan weer in
    await driver.get("http://localhost:3000/forgetme");
    await driver.sleep(500);
    await driver.get("http://localhost:3000");
    await driver.findElement(By.id('login-password')).sendKeys("woensdag", Key.RETURN);
    await driver.sleep(500);
    await driver.findElement(By.id('manage-button')).click();
    await driver.sleep(500);
    spriteUrls = await Promise.all((await driver.findElements(By.css(".sprite"))).map(elem => elem.getAttribute("src")));
    if (!spriteUrls.includes("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/8.png")) {
        console.log("wartortle ontbreekt!");
    }
  } finally {
    await driver.quit();
  }
})();