import { fetchCards, getAccessToken } from "../api.js";
import { credentials, printTitleBox } from "../index.js";
export async function cardsCommand() {
  printTitleBox();
  const token = await getAccessToken(
    credentials.host,
    credentials.clientId,
    credentials.secret,
    credentials.apikey,
  );
  console.log("💳 fetching cards");
  const result = await fetchCards(credentials.host, token);
  console.log("");
  if (!result) {
    console.log("No cards found");
    return;
  }
  console.log("Card Key \t Card Number \t\t Code Enabled");
  for (let i = 0; i < result.length; i++) {
    if (result[i]) {
      console.log(
        `${result[i]?.CardKey ?? "N/A"} \t ${
          result[i]?.CardNumber ?? "N/A"
        } \t ${result[i]?.IsProgrammable ?? "N/A"}`,
      );
    }
  }
  // console.table(result);
}
