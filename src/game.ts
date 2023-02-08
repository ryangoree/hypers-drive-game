import kaboom, { TweenController } from "kaboom";
import { PatchedBodyCompOpt } from "./@types";
import { GameStorage } from "./GameStorage";
import { commify, randNum, scale } from "./utils";
import { Settings } from "./settings";
import { Stat, Stats } from "./objects/Stats";
import { Events } from "./Events";
import { EventFeed } from "./objects/EventFeed";
import { Trades } from "./objects/Trades";
import { AudioManager } from "./AudioManager";
import { StarGenerator, Stars } from "./objects/Stars";

/**
 * Add default settings to a partial settings object
 */
function initSettings(settings?: Partial<Settings>): Settings {
  return {
    MODE: "hyperdrive",
    GRAVITY: 1750,
    JUMP_FORCE: 550,
    FALLING_VELOCITY: 600,
    SPEED: 5,
    FINAL_SPEED: 15,
    TIME_TO_HYPERDRIVE: 20,
    MIN_GAP: 180,
    MAX_GAP: 400,
    DEVIATION: 90,
    DEVIATION_COOLDOWN: 1,
    TIC_RATE: 0.7,
    EVENT_CHANCE: 100,
    ADD_TRADE_CHANCE: 50,
    ADD_LIQUIDITY_CHANCE: 25,
    REMOVE_LIQUIDITY_CHANCE: 25,
    VOLUME: 50,
    ...settings,
  };
}

export const Z = {
  stars: 0,
  bars: 5,
  player: 10,
  hud: 15,
};

const SPEED_OF_LIGHT = 186_000; // mi/s
const WARP_SPEED = SPEED_OF_LIGHT * 2;

export function startGame(gameSettings?: Partial<Settings>) {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;

  // Create kaboom instance
  const k = kaboom({
    background: [20, 22, 30],
    // play music outside of focus
    backgroundAudio: true,
    canvas,
  });

  // Calculate once and reuse
  const gameWidth = k.width();
  const gameHeight = k.height();

  // Add defaults to settings
  const settings = initSettings(gameSettings);
  const initialSettings = { ...settings };

  // Initiate helper classes
  const storage = new GameStorage();
  const audioManger = new AudioManager(k, settings);
  const events = new Events(settings);

  // Initiate reusable object classes outside the scenes
  const eventFeed = new EventFeed(k);
  const trades = new Trades(k, storage, settings);

  // Load fonts
  k.loadFont("M23", "./m23-r.ttf");
  k.loadFont("HardDrive", "./hard-drive.ttf");

  // Load sprites
  k.loadSprite("volume", "./volume.png", {
    sliceX: 3,
    anims: {
      high: {
        from: 0,
        to: 0,
      },
      low: 1,
      mute: 2,
    },
  });
  k.loadSprite("player", "./car-driving.png", {
    sliceX: 3,
    anims: {
      drive: {
        from: 0,
        to: 2,
        loop: true,
        speed: 48,
      },
    },
  });
  k.loadSprite("bird", "./bird.png");
  k.loadSprite("ryanGosling", "./ryan_gosling_drive_movie_ascii_art.png");
  k.loadSprite("right-arrow", "./right-arrow.png");
  k.loadSprite("left-arrow", "./left-arrow.png");

  // Add volume controls
  const volumeContainer = k.add([
    k.anchor("topright"),
    k.pos(gameWidth - 20, 20),
    k.fixed(),
    k.stay(),
    k.z(Z.hud),
  ]);

  // Volume bg
  const volumeButton = volumeContainer.add([
    k.circle(20),
    k.color(20, 22, 30),
    k.opacity(0.5),
    k.anchor("topright"),
    k.area(),
  ]);
  volumeButton.onHover(() => {
    k.setCursor("pointer");
    volumeButton.color = k.rgb(255, 255, 255);
    volumeButton.opacity = 0.2;
  });
  volumeButton.onHoverEnd(() => {
    k.setCursor("default");
    volumeButton.color = k.rgb(20, 22, 30);
    volumeButton.opacity = 0.5;
  });

  // Volume icon
  const volumeIcon = volumeContainer.add([
    k.sprite("volume"),
    k.anchor("center"),
    // @ts-ignore
    k.pos(-20, 20),
    k.area(),
  ]);

  // Mute the volume on click of the volume button
  volumeButton.onClick(() => {
    if (audioManger.isMuted) {
      audioManger.unMute();
      volumeIcon.play(settings.VOLUME < 50 ? "low" : "high");
    } else {
      audioManger.mute();
      volumeIcon.play("mute");
    }
  });

  // Scenes

  //////////////////////////////////////////////////////////////////////////////
  // START
  //////////////////////////////////////////////////////////////////////////////
  k.scene("start", () => {
    // Generate random stars
    Stars(k, {
      z: Z.stars,
    });
    StarGenerator(k, {
      z: Z.stars,
    });

    const title = k.add([
      k.text("HYPERS DRIVE", {
        font: "M23",
        size: 96,
      }),
      k.pos(gameWidth / 2, 100),
      k.anchor("center"),
    ]);

    const subTitle = title.add([
      k.text("Can you handle the quantum leap", {
        font: "HardDrive",
        size: 48,
      }),
      k.pos(0, 90),
      k.anchor("center"),
    ]);

    const playBtn = subTitle.add([
      k.pos(0, 80),
      k.anchor("center"),
      k.rect(200, 40, {
        radius: 8,
      }),
      k.color(255, 255, 255),
      k.area(),
    ]);
    playBtn.add([
      k.text("Play", {
        font: "M23",
        size: 20,
      }),
      k.color(0, 0, 0),
      k.pos(0, 0),
      k.anchor("center"),
    ]);
    playBtn.onHover(() => {
      k.setCursor("pointer");
    });
    playBtn.onHoverEnd(() => {
      k.setCursor("default");
    });
    playBtn.add([
      k.sprite("ryanGosling"),
      k.scale(0.2, 0.2),
      k.pos(0, 150),
      k.anchor("center"),

      k.area(),
      k.body({
        isStatic: true,
      } as PatchedBodyCompOpt),
    ]);
    playBtn.onClick(() => {
      k.setCursor("default");
      k.go("settings");
    });

    audioManger.play("StartMusic", {
      loop: true,
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  // GAME SETTINGS
  //////////////////////////////////////////////////////////////////////////////
  k.scene("settings", () => {
    StarGenerator(k, {
      z: Z.stars,
    });

    const container = k.add([k.pos(gameWidth / 2, 100), k.anchor("center")]);
    container.add([
      k.text("Game Settings", {
        font: "M23",
        size: 18,
      }),
      k.pos(0, 0),
      k.anchor("center"),
      k.color(255, 255, 255),
    ]);

    const startBtn = container.add([
      k.rect(100, 40, {
        radius: 8,
      }),
      k.anchor("center"),
      k.pos(0, 60),
      k.color(255, 255, 255),
      k.area(),
    ]);
    startBtn.add([
      k.text("Start", {
        font: "M23",
        size: 20,
      }),
      k.color(0, 0, 0),
      k.pos(0, 0),
      k.anchor("center"),
    ]);
    startBtn.onHover(() => {
      k.setCursor("pointer");
    });
    startBtn.onHoverEnd(() => {
      k.setCursor("default");
    });
    startBtn.onClick(() => {
      k.get("star").forEach((star) => {
        star.onUpdate(() => {
          star.pos.x -= randNum(1, settings.SPEED * 1.5);
        });
      });
      audioManger.stop("StartMusic");
      k.go("game");
    });

    const leftCol = container.add([
      k.pos(-160, 100),
      k.anchor("left"),
      k.rect(0, gameHeight / 10),
    ]);
    const rightCol = container.add([
      k.pos(160, 100),
      k.anchor("right"),
      k.rect(0, gameHeight / 10),
    ]);

    const gameModeStates: Record<Settings["MODE"], Settings["MODE"]> = {
      hyperdrive: "flappy",
      flappy: "hyperdrive",
    };
    leftCol.add([
      k.text("GAME MODE", {
        size: 16,
      }),
      k.pos(0, 7),
      k.anchor("topleft"),
    ]);
    const modeInput = rightCol.add([
      k.text("hyperdrive", {
        size: 16,
      }),
      k.pos(-15, 7),
      k.anchor("topright"),
      k.opacity(0.8),
      k.area(),
    ]);
    const leftArrow = modeInput.add([
      k.pos(-modeInput.width - 27, -2),
      k.sprite("left-arrow"),
      k.opacity(0.8),
      k.area(),
      "settings-arrow",
    ]);
    leftArrow.onHover(() => {
      leftArrow.opacity = 1;
      k.setCursor("pointer");
    });
    leftArrow.onHoverEnd(() => {
      leftArrow.opacity = 0.8;
      k.setCursor("default");
    });
    leftArrow.onClick(() => {
      const newMode = gameModeStates[settings.MODE];
      settings.MODE = newMode;
      modeInput.text = newMode;
      requestAnimationFrame(() => {
        leftArrow.pos.x = -modeInput.width - 27;
      });
    });
    const rightArrow = modeInput.add([
      k.pos(15, -2),
      k.sprite("right-arrow"),
      k.opacity(0.8),
      k.area(),
      "settings-arrow",
    ]);
    rightArrow.onHover(() => {
      rightArrow.opacity = 1;
      k.setCursor("pointer");
    });
    rightArrow.onHoverEnd(() => {
      rightArrow.opacity = 0.8;
      k.setCursor("default");
    });
    rightArrow.onClick(() => {
      const newMode = gameModeStates[settings.MODE];
      settings.MODE = newMode;
      initialSettings.MODE = newMode;
      modeInput.text = newMode;
      requestAnimationFrame(() => {
        leftArrow.pos.x = -modeInput.width - 27;
      });
    });

    let activeInput;
    Object.entries(settings).forEach(([setting, value], i) => {
      if (typeof value === "number") {
        leftCol.add([
          k.text(setting.replace(/_/g, " "), {
            size: 16,
          }),
          k.pos(0, 40 * i + 7),
          k.anchor("topleft"),
        ]);
        const input = rightCol.add([
          k.rect(60, 30, {
            radius: 4,
          }),
          k.pos(0, 40 * i),
          k.anchor("topright"),
          k.color(255, 255, 255),
          k.opacity(0.8),
          k.area(),
        ]);
        const inputValue = input.add([
          k.text(value.toString(), {
            size: 16,
          }),
          k.color(0, 0, 0),
          k.pos(-10, 7),
          k.anchor("topright"),
        ]);
        input.onHover(() => {
          k.setCursor("pointer");
        });
        input.onHoverEnd(() => {
          k.setCursor("default");
        });
        input.onClick(() => {
          if (activeInput) {
            activeInput.opacity = 0.8;
          }
          activeInput = input;
          input.opacity = 1;
        });
        k.onCharInput((ch) => {
          if (activeInput === input) {
            const newValue = inputValue.text + ch;
            inputValue.text = newValue;
            settings[setting] = parseFloat(newValue);
            initialSettings[setting] = parseFloat(newValue);
          }
        });
        k.onKeyPressRepeat("backspace", () => {
          if (activeInput === input) {
            inputValue.text = inputValue.text.slice(0, -1);
          }
        });
        k.onKeyPress("enter", () => {
          input.opacity = 0.8;
        });
        k.onKeyPress("escape", () => {
          input.opacity = 0.8;
        });
      }
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  // GAME
  //////////////////////////////////////////////////////////////////////////////
  k.scene("game", () => {
    // Reset storage to default state
    storage.reset();

    // Play background noise
    audioManger.play("GameBackgroundMusic", {
      volume: 0.2,
      loop: true,
    });

    // Establish gravity
    k.setGravity(settings.GRAVITY);

    // Reset and add the event feed
    eventFeed.clear();
    k.add(eventFeed.container);

    // Add boundaries. If the player hits a boundary, it's game over.
    k.add([
      "top",
      "obstacle",
      k.rect(gameWidth, 4),
      k.pos(0, 0),
      k.anchor("topleft"),
      k.area(),
      k.body({ isSolid: true, isStatic: true } as PatchedBodyCompOpt),
      k.color(255, 0, 0),
    ]);
    k.add([
      "bottom",
      "obstacle",
      k.rect(gameWidth, 4),
      k.pos(0, gameHeight),
      k.anchor("botleft"),
      k.area(),
      k.body({ isSolid: true, isStatic: true } as PatchedBodyCompOpt),
      k.color(255, 0, 0),
    ]);
    k.add([
      "left",
      "obstacle",
      k.rect(4, gameHeight),
      k.pos(0, 0),
      k.anchor("topleft"),
      k.area(),
      k.body({ isSolid: true, isStatic: true } as PatchedBodyCompOpt),
      k.color(255, 0, 0),
    ]);

    // Add the blastoff point. When the player reaches the blastoff point, they
    // engage hyperdrive and fly off screen at FTL speeds.
    const blastoff = k.add([
      "blastoff",
      k.rect(0, gameHeight),
      k.pos(gameWidth - 50, 0),
      k.anchor("topright"),
      k.area(),
    ]);

    // Generate random stars
    k.loop(0.08, () => {
      const star = k.add([
        "star",
        k.circle(randNum(1, 2)),
        k.pos(gameWidth, randNum(0, gameHeight)),
        k.anchor("left"),
        k.color(255, 255, 255),
        k.opacity(randNum(1, 5) / 10),
        k.offscreen({ destroy: true }),
        k.z(Z.stars),
        k.stay(),
      ]);
      star.onUpdate(() => {
        star.pos.x -= randNum(settings.SPEED * 1.2, settings.SPEED * 1.5);
      });
    });

    // Add the player and define it's starting x position
    const startingPlayerX = gameWidth / 5;
    const player = k.add([
      k.sprite("player"),
      k.pos(startingPlayerX, 80),
      k.anchor("botleft"),
      k.area(),
      k.body({
        // @ts-ignore
        maxVel: settings.FALLING_VELOCITY,
      }),
      k.z(Z.player),
    ]);
    player.play("drive");

    // Set a base player speed that represents the speed at which the player is
    // moving through space. At the base speed, only the background actually
    // moves on the canvas.
    const basePlayerSpeed = 125; // mi/s

    // Establish a speed the player will reach before engaging hyperdrive.
    const finalPlayerSpeed = 2_777; // mph

    const statEntries: Stat<string>[] = [
      ["LIQUIDITY", storage.liquidity],
      ["LONGS", storage.longsVolume],
      ["SHORTS", storage.shortsVolume],
      ["VOLUME", storage.totalVolume],
      ["SCORE", storage.score],
    ];

    // Add a list of stats
    const stats = new Stats(k, statEntries, {
      x: 20,
      y: 20,
    });

    let accelerateTween: TweenController;

    // Jump control which increases the score and shows a "+fees" message.
    const onJumpHandler = () => {
      // Make the player jump upward
      player.jump(settings.JUMP_FORCE);

      // Tween the angle of the car
      accelerateTween?.cancel();
      accelerateTween = k.tween(
        0,
        -10,
        0.15,
        (angle) => {
          // @ts-ignore
          player.angle = angle;
        },
        k.easings.easeOutSine
      );
      k.wait(0.15, () => {
        accelerateTween?.cancel();
        accelerateTween = k.tween(
          -10,
          0,
          0.25,
          (angle) => {
            // @ts-ignore
            player.angle = angle;
          },
          k.easings.easeInOutSine
        );
      });

      audioManger.play("JumpSound", {
        volume: 0.05,
      });

      const feesText = k.add([
        k.text("+Fees", {
          size: 18,
        }),
        k.pos(gameWidth - 50, 80),
        k.anchor("center"),
        Z.stars + 1,
      ]);

      // increase score and update stat object
      storage.score = storage.score + 10;
      stats.update("SCORE", storage.score);

      k.wait(0.5, () => {
        k.destroy(feesText);
      });
    };

    const jumpControl = k.onKeyPress("space", onJumpHandler);
    const jumpControlTouch = k.onTouchStart(onJumpHandler);

    // Track the number of ticks without a trade event.
    let noTradeTickCountdown = settings.DEVIATION_COOLDOWN;

    // Event loop
    const eventController = k.loop(settings.TIC_RATE, () => {
      const event = events.generateGameEvent();
      const eventAmount = randNum(100, storage.liquidity);

      switch (event) {
        case "ADD_TRADE":
          const type = Math.random() > 0.5 ? "LONG" : "SHORT";

          if (type === "LONG") {
            storage.addLong(eventAmount);
            stats.update("LONGS", storage.longsVolume);
          } else {
            storage.addShort(eventAmount);
            stats.update("SHORTS", storage.shortsVolume);
          }
          stats.update("VOLUME", storage.totalVolume);

          trades.add(
            eventAmount,
            type,
            noTradeTickCountdown ? settings.DEVIATION : undefined
          );
          eventFeed.add(
            `${type === "LONG" ? "Long" : "Short"} added: ${eventAmount}`
          );

          // reset the deviation cooldown
          noTradeTickCountdown = settings.DEVIATION_COOLDOWN;
          return;

        case "ADD_LIQUIDITY":
          storage.addLiquidity(eventAmount);
          stats.update("LIQUIDITY", storage.liquidity);
          eventFeed.add(`+${eventAmount} liquidity`);
          noTradeTickCountdown = Math.max(0, noTradeTickCountdown - 1);
          return;

        case "REMOVE_LIQUIDITY":
          storage.removeLiquidity(eventAmount);
          stats.update("LIQUIDITY", storage.liquidity);
          eventFeed.add(`-${eventAmount} liquidity`);
          noTradeTickCountdown = Math.max(0, noTradeTickCountdown - 1);
      }
    });

    // keep track of when blastoff starts
    let isBlastingOff = false;

    // End the game when the player hits an obstacle.
    player.onCollide("obstacle", () => {
      // Ignore the obstacles when blasting off
      if (isBlastingOff) {
        return;
      }
      audioManger.stop("GameBackgroundMusic");
      k.go("gameover");
    });

    switch (settings.MODE) {
      case "flappy":
        player.pos.x = gameWidth / 4;
        player.onCollide("bar", () => {
          audioManger.stop("GameBackgroundMusic");
          k.go("gameover");
        });
        break;
      case "hyperdrive":
        statEntries.push(["SPEED", commify(basePlayerSpeed)]);

        // Prep variables for tweening.
        const finalPlayerX = gameWidth + 100;
        let speedTween: TweenController;
        let speedStatTween: TweenController;
        let playerSpeedTween: TweenController;
        let currentPlayerSpeed = basePlayerSpeed;

        let isTweening = false;

        // Update the speed every 200 ms.
        k.loop(0.2, () => {
          stats.update("SPEED", formatSpeed(currentPlayerSpeed));
        });

        // Tween speeds
        function startTweening() {
          if (isTweening) {
            return;
          }
          isTweening = true;

          // Derive the duration of the tween from the distance between the player's
          // current and final position. The closer the player is to the final
          // position, the less time it takes to speed up.
          const duration = scale(
            player.pos.x,
            startingPlayerX,
            finalPlayerX,
            settings.TIME_TO_HYPERDRIVE,
            0
          );

          // Tween the SPEED setting to affect the movement of background objects.
          speedTween = k.tween(
            initialSettings.SPEED,
            settings.FINAL_SPEED,
            duration,
            (speed) => {
              settings.SPEED = speed;
            },
            k.easings.easeInCubic
          );

          // Tween the speed stat.
          speedStatTween = k.tween(
            basePlayerSpeed,
            finalPlayerSpeed,
            duration,
            (speed) => {
              currentPlayerSpeed = speed;
              storage.topSpeed = Math.max(speed, storage.topSpeed);
            },
            k.easings.easeInCubic
          );

          // Tween the player speed to affect the player's movement.
          playerSpeedTween = k.tween(
            player.pos.x,
            finalPlayerX,
            duration,
            (x) => {
              player.pos.x = x;
            },
            k.easings.easeInCubic
          );
          // });
        }

        // Start tweening immediately
        startTweening();

        // Stop tweening when the player hits a bar.
        player.onCollide("bar", () => {
          if (isBlastingOff) {
            return;
          }
          playerSpeedTween.cancel();
          speedStatTween.cancel();
          speedTween.cancel();
          isTweening = false;
          settings.SPEED = initialSettings.SPEED;
          stats.update("SPEED", formatSpeed(basePlayerSpeed));
        });

        // Start tweening again after the player clears the bar.
        player.onCollideEnd("bar", () => {
          startTweening();
        });

        // Engage hyperdrive when the player hits the blastoff point.
        player.onCollide("blastoff", () => {
          isBlastingOff = true;

          audioManger.play("HyperdriveSound");

          // Stop tweening
          speedTween.cancel();
          playerSpeedTween.cancel();
          speedStatTween.cancel();

          // Stop the event loop
          eventController.cancel();

          // Destroy the blastoff point to allow the player to pass it.
          blastoff.destroy();

          // Turn off the jump control.
          jumpControl.cancel();
          jumpControlTouch.cancel();

          // Remove gravity to keep the player from falling.
          k.setGravity(0);

          // Set the top speed to FTL for hyperspace.
          storage.topSpeed = WARP_SPEED;
          // stats.update("SPEED", `${formatSpeed(WARP_SPEED)}!!!`);
          currentPlayerSpeed = WARP_SPEED;

          let warpLineBaseSpeed = 5;
          let warpLineBaseWidth = 1;
          let warpLineHeight = 10;
          let warpLineBaseOpacity = 2;

          // Add blocky lines when hyperdrive is engaging.
          k.loop(0.01, () => {
            const warpLine = k.add([
              "warpLine",
              k.rect(
                randNum(warpLineBaseWidth, warpLineBaseWidth * 5),
                warpLineHeight
              ),
              k.pos(gameWidth + 100, randNum(0, gameHeight)),
              k.anchor("left"),
              k.color(255, 255, 255),
              k.opacity(
                randNum(warpLineBaseOpacity, warpLineBaseOpacity * 3) / 10
              ),
              k.offscreen({ destroy: true }),
              k.z(Z.stars),
            ]);
            warpLine.onUpdate(() => {
              warpLine.pos.x -= randNum(
                warpLineBaseSpeed,
                warpLineBaseSpeed * 2
              );
            });
          });

          // Tween the SPEED setting to make background objects speed up.
          k.tween(
            settings.SPEED,
            settings.SPEED * 10,
            1,
            (speed) => {
              settings.SPEED = speed;
            },
            k.easings.easeInCubic
          );

          // Move the player back on the canvas to prepare for blast off.
          k.tween(
            player.pos.x,
            gameWidth / 5,
            3,
            (x) => (player.pos.x = x),
            k.easings.easeInOutCubic
          );

          k.wait(2, () => {
            // Speed the warp lines up
            k.tween(
              warpLineBaseSpeed,
              warpLineBaseSpeed * 5,
              2,
              (speed) => {
                warpLineBaseSpeed = speed;
              },
              k.easings.easeInCirc
            );

            // Shrink the warp line heights
            k.tween(
              warpLineHeight,
              2,
              3,
              (height) => {
                warpLineHeight = height;
              },
              k.easings.easeInCirc
            );

            // Stretch the warp lines
            k.tween(
              warpLineBaseWidth,
              warpLineBaseWidth * 15,
              2,
              (width) => {
                warpLineBaseWidth = width;
              },
              k.easings.easeInCirc
            );
          });

          // HYPERSPACE
          k.wait(4.1, () => {
            // Propel the player forward
            k.tween(
              player.pos.x,
              finalPlayerX + 1000,
              0.1,
              (x) => (player.pos.x = x),
              k.easings.easeInCubic
            );

            // Angle the player back
            k.tween(
              0,
              -15,
              0.1,
              (angle) => {
                // @ts-ignore
                player.angle = angle;
              },
              k.easings.easeOutCubic
            );

            // Speed the warp lines up even more!
            k.tween(
              warpLineBaseSpeed,
              warpLineBaseSpeed * 10,
              0.1,
              (speed) => {
                warpLineBaseSpeed = speed;
              },
              k.easings.easeInCubic
            );

            // Shrink the warp line heights even more!
            k.tween(
              warpLineHeight,
              1,
              0.1,
              (height) => {
                warpLineHeight = height;
              },
              k.easings.easeInCubic
            );

            // Stretch the warp lines even more!
            k.tween(
              warpLineBaseWidth,
              warpLineBaseWidth * 2,
              0.1,
              (width) => {
                warpLineBaseWidth = width;
              },
              k.easings.easeInCubic
            );

            // Fade the blocks out
            k.tween(
              warpLineBaseOpacity,
              0,
              4,
              (opacity) => {
                warpLineBaseOpacity = opacity;
              },
              k.easings.easeInQuad
            );
          });

          // End the game
          k.wait(9, () => {
            audioManger.stop("GameBackgroundMusic");
            k.go("goodEnding");
          });
        });
    }

    const transitionToStartGame = () => {
      audioManger.stop("HyperdriveSound");
      audioManger.stop("GameBackgroundMusic");
      k.go("start");
    };

    k.onKeyPress("escape", transitionToStartGame);
    // k.onTouchStart(transitionToStartGame);
  });

  k.scene("goodEnding", () => {
    // Generate random stars
    for (let i = 0; i < 100; i++) {
      const star = k.add([
        "star",
        k.circle(randNum(1, 2)),
        k.pos(randNum(0, gameWidth), randNum(0, gameHeight)),
        k.anchor("left"),
        k.color(255, 255, 255),
        k.opacity(randNum(2, 6) / 10),
        k.offscreen({ destroy: true }),
        k.z(Z.stars),
        k.stay(),
      ]);
      star.onUpdate(() => {
        star.pos.x -= randNum(0.2, 1);
      });
    }
    k.loop(0.5, () => {
      const star = k.add([
        "star",
        k.circle(randNum(1, 2)),
        k.pos(gameWidth, randNum(0, gameHeight)),
        k.anchor("left"),
        k.color(255, 255, 255),
        k.opacity(randNum(2, 6) / 10),
        k.offscreen({ destroy: true }),
        k.z(Z.stars),
        k.stay(),
      ]);
      star.onUpdate(() => {
        star.pos.x -= randNum(0.2, 1);
      });
    });

    const title = k.add([
      k.text("HYPERDRIVE", {
        font: "M23",
        size: 96,
      }),
      k.pos(gameWidth / 2, gameHeight / 3),
      k.anchor("center"),
      k.opacity(50),
      k.fadeIn(4),
    ]);

    k.wait(2, () => {
      const subTitle = title.add([
        k.text("Coming in the year 2023", {
          font: "HardDrive",
          size: 56,
        }),
        k.pos(0, 100),
        k.anchor("center"),
        k.opacity(40),
        k.fadeIn(6),
      ]);

      k.wait(1, () => {
        subTitle.add([
          k.text("Built By Element Finance", {
            font: "M23",
            size: 24,
          }),
          k.pos(0, 250),
          k.anchor("center"),
          k.opacity(40),
          k.fadeIn(6),
        ]);
      });
    });

    const handleNextTransition = () => {
      k.get("star").forEach((star) => {
        star.destroy();
      });
      audioManger.stop("HyperdriveSound");
      k.go("start");
    };

    // Event callback handlers
    k.onKeyPress("enter", handleNextTransition);
    k.onTouchStart(handleNextTransition);
  });

  //////////////////////////////////////////////////////////////////////////////
  // GAME OVER, MAN
  //////////////////////////////////////////////////////////////////////////////
  k.scene("gameover", () => {
    k.add([k.text("Game over!"), k.pos(gameWidth / 2, 50), k.anchor("center")]);
    k.add([
      k.text("Press SPACE or TOUCH to restart", {
        size: 20,
      }),
      k.pos(gameWidth / 2, 250),
      k.anchor("center"),
    ]);

    const highScore = localStorage.highScore || 0;
    if (storage.score > highScore) {
      localStorage.highScore = storage.score;
    }

    const stats = new Stats(
      k,
      [
        ["VOLUME", storage.totalVolume],
        ["SCORE", storage.score],
        ["TOP SPEED", formatSpeed(storage.topSpeed)],
      ],
      {
        alignment: "center",
        x: gameWidth / 2,
        y: 270,
      }
    );

    const highScoreObj = k.add([
      k.text(`HIGH SCORE: ${localStorage.highScore}`, {
        size: 18,
      }),
      k.pos(gameWidth / 2, stats.bottomY() + 40),
      k.anchor("center"),
    ]);

    k.add([
      k.text("Press ESC to return to the start menu", {
        size: 20,
      }),
      k.pos(gameWidth / 2, highScoreObj.pos.y + 100),
      k.anchor("center"),
    ]);

    // Event callback handlers
    k.onKeyPress("space", () => {
      k.go("game");
    });
    k.onKeyPress("escape", () => {
      k.go("start");
    });

    k.onTouchStart(() => {
      k.go("game");
    });
  });

  k.go("start");

  focus();
}

function formatSpeed(speed: number) {
  return speed === WARP_SPEED ? `Warp Speed!` : `${commify(speed, 0)} mi/s`;
}
