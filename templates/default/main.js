// This function runs before a transaction.
const _beforeTransaction = async (authorization) => {
  console.log(authorization);
};
// This function runs after a transaction was successful.
const _afterTransaction = async (transaction) => {
  console.log(transaction);
};
// This function runs after a transaction was declined.
const _afterDecline = async (transaction) => {
  console.log(transaction);
};
