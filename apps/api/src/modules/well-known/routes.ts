import { Router } from "express";
import { env } from "../../config/env";

export const wellKnownRouter = Router();

wellKnownRouter.get("/security.txt", (_req, res) => {
  res.type("text/plain");
  res.send(`Contact: mailto:security@cecit.edu.so
Expires: 2027-10-23T00:00:00.000Z
Preferred-Languages: en, so
Canonical: ${env.WEB_ORIGIN}/.well-known/security.txt
Policy: ${env.WEB_ORIGIN}/security-policy
`);
});
