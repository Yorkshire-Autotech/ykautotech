import { bookingConfig } from "../_config.js";
import { errorResponse, json } from "../_lib.js";

export async function onRequestGet({ env }) {
  try {
    return json(await bookingConfig(env));
  } catch (error) {
    return errorResponse(error);
  }
}
