// This function runs before a transaction.
const beforeTransaction = async (authorization) => {
    console.log(authorization);
  };
  // This function runs after a transaction was successful.
  const afterTransaction = async (transaction) => {
    console.log(transaction);
  };
  // This function runs after a transaction was declined.
  const afterDecline = async (transaction) => {
    console.log(transaction);
  };
  