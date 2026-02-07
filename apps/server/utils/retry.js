/**
 * Retry helper with exponential backoff
 */
async function retry(fn, retries = 5, delay = 1000) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;

    console.log(
      `⚠️ Retry failed. Waiting ${delay}ms... (${retries} retries left)`
    );

    // Wait before retry
    await new Promise((res) => setTimeout(res, delay));

    // Exponential backoff
    return retry(fn, retries - 1, delay * 2);
  }
}

module.exports = { retry };
