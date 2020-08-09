const timeMachine = require("./timeMachine");

const origem = process.argv[2];
const destino = process.argv[3];

console.log("Time Machine");
console.log(origem, " -> ", destino);

timeMachine(origem, destino).then((log) => console.log(log));
