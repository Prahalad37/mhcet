/** HTTP error with optional safe client exposure for 5xx. */
export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {{ expose?: boolean }} [opts]
   */
  constructor(status, message, opts = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.expose = opts.expose !== false;
  }
}
