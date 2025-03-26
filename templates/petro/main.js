//Merchant codes for fuel
//5499 : "Miscellaneous Food Stores - Convenience Stores and Specialty Markets"
//5541 : "Service Stations"
//5172 : "Petroleum and Petroleum Products"
//5542 : "Automated Fuel Dispensers"
const fuelCodes = ['5499', '5541', '5172', '5542'];

const beforeTransaction = async (authorization) => {
  console.log(authorization);
  if (fuelCodes.indexOf(authorization.merchant.category.code) > -1) {
    return true;
  }
  return false;
};

// This function runs after a transaction.
const afterTransaction = async (transaction) => {
  console.log(transaction);
};

const afterDecline = async (transaction) => {
  console.log(transaction);
};