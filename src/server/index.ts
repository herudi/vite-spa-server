import { expressServer } from "./express.js";
import { honoServer } from "./hono.js";
import { nhttpServer } from "./nhttp.js";

export default {
  [expressServer.name]: expressServer,
  [honoServer.name]: honoServer,
  [nhttpServer.name]: nhttpServer,
};
