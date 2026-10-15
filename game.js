
import * as THREE from
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// ---------- BASIC THREE.JS SETUP ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x83c9a0);
scene.fog = new THREE.Fog(0x83c9a0, 25, 100);

const camera = new THREE.PerspectiveCamera(
  65, innerWidth / innerHeight, 0.1, 150
);
camera.position.set(0, 5, 9);
camera.lookAt(0, 1, -5);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x24452a, 2));

const sunlight = new THREE.DirectionalLight(0xffffff, 3);
sunlight.position.set(-5, 12, 5);
sunlight.castShadow = true;
scene.add(sunlight);

// Materials
const green = new THREE.MeshStandardMaterial({
  color: 0x24653c
});
const brown = new THREE.MeshStandardMaterial({
  color: 0x765037
});
const stone = new THREE.MeshStandardMaterial({
  color: 0x817c68
});
const gold = new THREE.MeshStandardMaterial({
  color: 0xffcf24,
  metalness: 0.65,
  roughness: 0.25,
  emissive: 0x664000
});
const blue = new THREE.MeshStandardMaterial({
  color: 0x1689a6
});
const skin = new THREE.MeshStandardMaterial({
  color: 0xd89a6b
});
const red = new THREE.MeshStandardMaterial({
  color: 0xb7442b
});

const box = new THREE.BoxGeometry(1, 1, 1);
const sphere = new THREE.SphereGeometry(1, 12, 10);
const cylinder = new THREE.CylinderGeometry(
  0.5, 0.5, 1, 12
);

function addBox(parent, material, x, y, z, sx, sy, sz) {
  const obj = new THREE.Mesh(box, material);
  obj.position.set(x, y, z);
  obj.scale.set(sx, sy, sz);
  obj.castShadow = true;
  obj.receiveShadow = true;
  parent.add(obj);
  return obj;
}

function addSphere(parent, material, x, y, z, sx, sy, sz) {
  const obj = new THREE.Mesh(sphere, material);
  obj.position.set(x, y, z);
  obj.scale.set(sx, sy, sz);
  obj.castShadow = true;
  parent.add(obj);
  return obj;
}

// ---------- JUNGLE WORLD ----------
const world = new THREE.Group();
scene.add(world);

addBox(world, green, 0, -0.5, -35, 100, 0.5, 100);

// Running road
addBox(world, brown, 0, -0.18, -35, 7, 0.35, 100);

// Road edges
addBox(world, stone, -3.6, 0, -35, 0.2, 0.3, 100);
addBox(world, stone, 3.6, 0, -35, 0.2, 0.3, 100);

// Road markings
const stripes = [];
for (let i = 0; i < 35; i++) {
  const stripe = addBox(
    world, stone, 0, 0.02, -i * 3,
    6.8, 0.035, 0.06
  );
  stripes.push(stripe);
}

// Jungle trees
for (let i = 0; i < 35; i++) {
  for (const side of [-1, 1]) {
    const tree = new THREE.Group();
    tree.position.set(
      side * (5 + Math.random() * 3),
      0,
      -i * 3.2 - 5
    );

    world.add(tree);

    const scale = 0.7 + Math.random() * 0.7;

    const trunk = new THREE.Mesh(cylinder, brown);
    trunk.position.y = 1.1;
    trunk.scale.set(0.35, 2.2, 0.35);
    tree.add(trunk);

    addSphere(
      tree, green, 0, 2.7, 0,
      1.2 * scale, 1.4 * scale, scale
    );
  }
}

// Distant temple
const temple = new THREE.Group();
temple.position.set(0, 0, -78);
world.add(temple);

addBox(temple, stone, 0, 2.5, 0, 9, 5, 2);
addBox(temple, brown, 0, 5.2, 0, 11, 0.5, 3);

for (let x = -3.5; x <= 3.5; x += 2.3) {
  const pillar = new THREE.Mesh(cylinder, stone);
  pillar.position.set(x, 2.4, 1.2);
  pillar.scale.set(0.5, 4.8, 0.5);
  temple.add(pillar);
}

// ---------- PLAYER CHARACTER ----------
const player = new THREE.Group();
scene.add(player);
player.position.set(0, 0, 2);

const body = new THREE.Group();
player.add(body);

addBox(body, blue, 0, 1.2, 0, 0.65, 0.8, 0.4);
addSphere(body, skin, 0, 1.9, 0, 0.32, 0.35, 0.32);
addBox(body, blue, -0.43, 1.2, 0, 0.2, 0.65, 0.2);
addBox(body, blue, 0.43, 1.2, 0, 0.2, 0.65, 0.2);

const leftLeg = addBox(
  body, stone, -0.19, 0.45, 0, 0.24, 0.6, 0.25
);
const rightLeg = addBox(
  body, stone, 0.19, 0.45, 0, 0.24, 0.6, 0.25
);

// ---------- GAME STATE ----------
const lanePositions = [-2.15, 0, 2.15];
let lane = 1;
let running = false;
let ended = false;
let score = 0;
let coinCount = 0;
let speed = 14;
let jumpTime = 0;
let slideTime = 0;
let spawnTimer = 0;
let coinTimer = 0;
let elapsed = 0;

const obstacles = [];
const coins = [];

const scoreEl = document.getElementById("score");
const coinsEl = document.getElementById("coins");
const menu = document.getElementById("menu");
const gameover = document.getElementById("gameover");

// ---------- OBSTACLES ----------
function spawnObstacle() {
  const laneIndex = Math.floor(Math.random() * 3);
  const isArch = Math.random() < 0.35;

  const obj = new THREE.Group();
  obj.position.set(lanePositions[laneIndex], 0, -55);

  if (isArch) {
    // Slide under the top bar
    addBox(obj, red, -0.5, 1.0, 0, 0.2, 2, 0.35);
    addBox(obj, red, 0.5, 1.0, 0, 0.2, 2, 0.35);
    addBox(obj, red, 0, 2.0, 0, 1.2, 0.2, 0.4);
  } else {
    // Jump over the block
    addBox(obj, red, 0, 0.6, 0, 1.1, 1.2, 0.9);
  }

  world.add(obj);
  obstacles.push({
    obj,
    lane: laneIndex,
    isArch,
    hit: false
  });
}

// ---------- COINS ----------
function spawnCoins() {
  const laneIndex = Math.floor(Math.random() * 3);

  for (let i = 0; i < 5; i++) {
    const coin = new THREE.Mesh(cylinder, gold);
    coin.position.set(
      lanePositions[laneIndex], 1.25, -45 - i * 1.7
    );
    coin.scale.set(0.65, 0.16, 0.65);
    coin.rotation.x = Math.PI / 2;
    world.add(coin);

    coins.push({
      obj: coin,
      lane: laneIndex,
      collected: false
    });
  }
}

// ---------- CONTROLS ----------
function moveLane(direction) {
  if (!running) return;
  lane = Math.max(0, Math.min(2, lane + direction));
}

function jump() {
  if (running && jumpTime <= 0 && slideTime <= 0) {
    jumpTime = 0.8;
  }
}

function slide() {
  if (running && slideTime <= 0 && jumpTime <= 0) {
    slideTime = 0.75;
  }
}

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    moveLane(-1);
  }
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    moveLane(1);
  }
  if (e.key === "ArrowUp" || e.key === " ") jump();
  if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") slide();
});

document.getElementById("left").onclick = () => moveLane(-1);
document.getElementById("right").onclick = () => moveLane(1);
document.getElementById("jump").onclick = jump;
document.getElementById("slide").onclick = slide;

// Swipe controls
let touchStart = null;

renderer.domElement.addEventListener("pointerdown", e => {
  touchStart = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener("pointerup", e => {
  if (!touchStart) return;

  const dx = e.clientX - touchStart.x;
  const dy = e.clientY - touchStart.y;

  if (Math.max(Math.abs(dx), Math.abs(dy)) > 25) {
    if (Math.abs(dx) > Math.abs(dy)) {
      moveLane(dx > 0 ? 1 : -1);
    } else if (dy < 0) {
      jump();
    } else {
      slide();
    }
  }

  touchStart = null;
});

// ---------- START / RESTART ----------
function startGame() {
  obstacles.forEach(o => world.remove(o.obj));
  coins.forEach(c => world.remove(c.obj));
  obstacles.length = 0;
  coins.length = 0;

  score = 0;
  coinCount = 0;
  speed = 14;
  elapsed = 0;
  lane = 1;
  jumpTime = 0;
  slideTime = 0;
  spawnTimer = 0.5;
  coinTimer = 1;
  player.position.set(0, 0, 2);
  body.scale.y = 1;
  body.position.y = 0;

  scoreEl.textContent = "0";
  coinsEl.textContent = "0";

  ended = false;
  running = true;
  menu.classList.add("hidden");
  gameover.classList.add("hidden");
}

function endGame() {
  if (ended) return;

  ended = true;
  running = false;

  document.getElementById("finalScore").textContent =
    Math.floor(score);

  gameover.classList.remove("hidden");
}

document.getElementById("start").onclick = startGame;
document.getElementById("restart").onclick = startGame;

// ---------- MAIN GAME LOOP ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.04);

  if (running) {
    elapsed += dt;
    speed = Math.min(28, 14 + elapsed * 0.25);

    score += dt * speed;
    scoreEl.textContent = Math.floor(score);

    spawnTimer -= dt;
    coinTimer -= dt;

    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = Math.max(0.85, 1.5 - elapsed * 0.004);
    }

    if (coinTimer <= 0) {
      spawnCoins();
      coinTimer = 2.4;
    }

    // Smooth lane movement
    player.position.x = THREE.MathUtils.damp(
      player.position.x, lanePositions[lane], 12, dt
    );

    // Jump arc
    if (jumpTime > 0) {
      jumpTime -= dt;
      const t = 1 - Math.max(0, jumpTime) / 0.8;
      player.position.y = Math.sin(t * Math.PI) * 1.65;
    } else {
      player.position.y = THREE.MathUtils.damp(
        player.position.y, 0, 12, dt
      );
    }

    // Slide pose
    if (slideTime > 0) {
      slideTime -= dt;
      body.scale.y = 0.55;
      body.position.y = -0.3;
    } else {
      body.scale.y = THREE.MathUtils.damp(
        body.scale.y, 1, 12, dt
      );
      body.position.y = THREE.MathUtils.damp(
        body.position.y, 0, 12, dt
      );
    }

    // Running animation
    const swing = Math.sin(elapsed * 13) * 0.45;
    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;
    body.rotation.z = THREE.MathUtils.damp(
      body.rotation.z,
      (lanePositions[lane] - player.position.x) * 0.1,
      8, dt
    );

    // Move road markings
    stripes.forEach(stripe => {
      stripe.position.z += speed * dt;

      if (stripe.position.z > 5) {
        stripe.position.z -= 105;
      }
    });

    // Move obstacles and detect collisions
    for (const item of obstacles) {
      item.obj.position.z += speed * dt;

      const close = Math.abs(
        item.obj.position.z - player.position.z
      ) < 0.85;

      const sameLane = Math.abs(
        item.obj.position.x - player.position.x
      ) < 0.9;

      if (!item.hit && close && sameLane) {
        const jumpedOver =
          !item.isArch && jumpTime > 0.15;

        const slidUnder =
          item.isArch && slideTime > 0.15;

        if (!jumpedOver && !slidUnder) {
          item.hit = true;
          endGame();
        }
      }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (obstacles[i].obj.position.z > 12) {
        world.remove(obstacles[i].obj);
        obstacles.splice(i, 1);
      }
    }

    // Move and collect coins
    for (const coin of coins) {
      coin.obj.position.z += speed * dt;
      coin.obj.rotation.z += dt * 3;

      const close = Math.abs(
        coin.obj.position.z - player.position.z
      ) < 0.9;

      const sameLane = Math.abs(
        coin.obj.position.x - player.position.x
      ) < 0.85;

      if (!coin.collected && close && sameLane) {
        coin.collected = true;
        world.remove(coin.obj);
        coinCount++;
        coinsEl.textContent = coinCount;
      }
    }

    for (let i = coins.length - 1; i >= 0; i--) {
      if (coins[i].collected || coins[i].obj.position.z > 12) {
        world.remove(coins[i].obj);
        coins.splice(i, 1);
      }
    }

    camera.position.x = THREE.MathUtils.damp(
      camera.position.x, player.position.x * 0.2, 3, dt
    );
    camera.lookAt(player.position.x * 0.12, 1, -5);
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
