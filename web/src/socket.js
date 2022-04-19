import { io } from 'socket.io-client';
import { connectionAddress } from './connectionAddress';

export const socket = io.connect(connectionAddress());
export let socketID = '';
socket.on('connect', () => {
    socketID = socket.id;
})