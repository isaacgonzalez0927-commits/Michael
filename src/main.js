import './style.css';
import { Game } from './game/Game.js';

const canvas = document.querySelector('#game-canvas');
const overlay = document.querySelector('#overlay');
const game = new Game(canvas, overlay);
game.start();
window.__milkshake = game;
