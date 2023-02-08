import { startGame } from "./game";
import "./style.css";

const gameCanvas = document.getElementById("game-canvas");
startGame();
gameCanvas.focus();
