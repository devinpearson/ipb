import chalk from "chalk";
import { credentials, initializePbApi } from "../index.js";
interface Options {
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  verbose: boolean;
}

export async function beneficiariesCommand(options: Options) {
  try {
    const api = await initializePbApi(credentials, options);

    console.log("💳 fetching beneficiaries");
    const result = await api.getBeneficiaries();
    const beneficiaries = result.data;
    console.log("");
    if (!beneficiaries) {
      console.log("No beneficiaries found");
      return;
    }
    //console.table(beneficiaries);
    console.log("Beneficiary Id \t\t\tAccount Number \tBeneficiary Name\t\t\tLast Payment Date");
    for (let i = 0; i < beneficiaries.length; i++) {
      if (beneficiaries[i]) {
        console.log(
          chalk.greenBright(`${beneficiaries[i]?.beneficiaryId ?? "N/A"}\t`) +
            chalk.blueBright(`${beneficiaries[i]?.accountNumber ?? "N/A"}\t`) +
            chalk.redBright(`${beneficiaries[i]?.beneficiaryName ?? "N/A"}\t\t\t`) +
            chalk.yellowBright(`${beneficiaries[i]?.lastPaymentDate ?? "N/A"}`),
        );
      }
    }
    console.log("");
  } catch (error: any) {
    console.error(
      chalk.redBright("Failed to fetch beneficiaries:"),
      error.message,
    );
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
