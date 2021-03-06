import * as jwt from "jsonwebtoken";
import { fromEvent } from "most";
import { connect as mqttConnect, MqttClient } from "mqtt";
import { IClientConnection, IClientOptions } from "../src/types";

export function connect(
  token: string,
  options?: IClientOptions
): Promise<IClientConnection> {
  const defaultOptions: IClientOptions = {
    clientId: `device_${new Date().getTime()}`,
    host: process.env.BROKER_HOST || "0.0.0.0",
    parse: JSON.parse,
    port: process.env.BROKER_PORT || "1883",
    protocol: "mqtt"
  };

  const opts: IClientOptions = { ...defaultOptions, ...options };

  process.on("uncaughtException", exception => {
    opts.logger.error("client", "uncaughtException", exception);
    throw exception;
  });

  return new Promise(
    (
      resolve: (
        value?: IClientConnection | PromiseLike<IClientConnection>
      ) => void,
      reject: (reason?: Error) => void
    ) => {
      try {
        const client: MqttClient = mqttConnect(
          `ws://${opts.host}:${opts.port}`,
          {
            // protocol: opts.protocol,
            // keys: opts.keys,
            clientId: opts.clientId,
            password: token,
            rejectUnauthorized: false,
            username: "JWT"
          }
        );

        client.on("connect", () => {
          const conn: IClientConnection = { client, options: opts };
          resolve(conn);
        });
        client.on("error", (err: Error) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    }
  );
}

export interface ITopicResponse {
  user_id?: string;
  payload: any;
}

export function subscribe(topic: string, connection: IClientConnection) {
  connection.client.subscribe(topic);

  return fromEvent("message", connection.client)
    .filter(ev => {
      const messageTopicParts = ev[0].split("/");
      const subscribeTopicParts = topic.split("/");
      if (messageTopicParts.length !== subscribeTopicParts.length) {
        return false;
      }
      const newMessageTopic = subscribeTopicParts
        .map((curr, index) => {
          if (curr === "+") {
            return "+";
          } else {
            return messageTopicParts[index];
          }
        })
        .join("/");

      return newMessageTopic === topic;
    })
    .map(
      (ev): ITopicResponse => {
        const payloadStr = ev[1].toString();
        const payload = connection.options.parse(payloadStr);
        const topicSegments = ev[0].split("/");
        const response: ITopicResponse = { payload };
        response.user_id = topicSegments[0];

        return response;
      }
    );
}

export function publish(
  topic: string,
  payload: any,
  connection: IClientConnection
) {
  connection.client.publish(topic, payload);
}

export function getHandlerToken() {
  return jwt.sign(
    {
      handler: {
        ip: "1.2.3.4",
        name: "test_handler3r"
      }
    },
    process.env.JWT_SECRET || "shhhhh"
  );
}
