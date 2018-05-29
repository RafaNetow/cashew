import * as jwt from 'jsonwebtoken';
import { MqttClient } from 'mqtt';
import { connect, subscribe } from '../../src/client';

const userId = 139871238127389;
const token = jwt.sign({ user_id: userId }, process.env.JWT_SECRET || 'shhhhh');

export function startMobileDevice() {

  const options = {    
    clientId: 'mobile',
  };
  connect(token, options)
    .then((client: MqttClient) => {
      setTimeout(() => {
        client.publish('get_apples', JSON.stringify({ user_id: userId }));
        setTimeout(() => {
          client.publish('get_more_apples', JSON.stringify({ user_id: userId }));
        },         8000);
      },         3000);

      const topic = `${userId}/got_apples`;
      subscribe(client, topic)
        .then(apples => {
          console.log('subscriber receiving', topic, apples);
        });
    });
}