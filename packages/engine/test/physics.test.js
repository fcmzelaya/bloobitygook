import { describe, it, expect } from "vitest";
import { createWorld, spawn } from "../src/world.js";
import {
  gravitySystem,
  integrateSystem,
  collisionSystem,
  ballCollisionSystem,
  deformationSystem,
  renderSystem,
} from "../src/physics.js";

describe("gravitySystem", () => {
  it("uniform mode adds straight down, scaled by dt", () => {
    const world = createWorld();
    const e = spawn(world, { dynamic: true, vy: 0 });
    gravitySystem(world, 0.1, { mode: "uniform", magnitude: 900 });
    expect(e.vy).toBeCloseTo(90);
  });

  it("point mode pulls toward the target at constant magnitude, not inverse-square", () => {
    const world = createWorld();
    const e = spawn(world, { dynamic: true, x: 0, y: 0, vx: 0, vy: 0 });
    gravitySystem(world, 1, { mode: "point", magnitude: 50, x: 100, y: 0 });
    expect(e.vx).toBeCloseTo(50); // unit vector (1,0) * magnitude * dt
    expect(e.vy).toBeCloseTo(0);
  });
});

describe("collisionSystem", () => {
  it("reflects vy by restitution and repositions to the floor on impact", () => {
    const world = createWorld();
    const e = spawn(world, {
      dynamic: true, x: 400, y: 555, vx: 0, vy: 100,
      radius: 10, restitution: 0.5, friction: 0.2,
    });
    collisionSystem(world, { floorY: 560, left: 0, right: 800 });
    expect(e.y).toBe(550); // floorY - radius
    expect(e.vy).toBe(-50); // -100 * restitution
  });

  it("reflects vx by restitution and repositions off the left wall", () => {
    const world = createWorld();
    const e = spawn(world, {
      dynamic: true, x: 5, y: 300, vx: -50, vy: 0,
      radius: 10, restitution: 0.6, friction: 0.3,
    });
    collisionSystem(world, { floorY: 560, left: 0, right: 800 });
    expect(e.x).toBe(10); // left + radius
    expect(e.vx).toBe(30); // -(-50) * restitution
  });

  it("does nothing when the entity is within bounds", () => {
    const world = createWorld();
    const e = spawn(world, {
      dynamic: true, x: 400, y: 300, vx: 10, vy: 10,
      radius: 10, restitution: 0.5, friction: 0.2,
    });
    collisionSystem(world, { floorY: 560, left: 0, right: 800 });
    expect(e.x).toBe(400);
    expect(e.y).toBe(300);
    expect(e.vx).toBe(10);
    expect(e.vy).toBe(10);
  });
});

describe("ballCollisionSystem", () => {
  it("resolves an overlap between equal-mass balls to exactly touching distance", () => {
    const world = createWorld();
    const a = spawn(world, {
      dynamic: true, x: 200, y: 200, vx: 50, vy: 0,
      radius: 20, restitution: 0.8, friction: 0.2,
    });
    const b = spawn(world, {
      dynamic: true, x: 215, y: 200, vx: -50, vy: 0,
      radius: 20, restitution: 0.8, friction: 0.2,
    });
    ballCollisionSystem(world);

    // Equal masses (radius^2) split the 25px overlap 50/50.
    expect(a.x).toBeCloseTo(187.5);
    expect(b.x).toBeCloseTo(227.5);
    expect(b.x - a.x).toBeCloseTo(40); // == radius sum (minDist)

    // Impulse-based elastic response along the normal.
    expect(a.vx).toBeCloseTo(-40);
    expect(b.vx).toBeCloseTo(40);
  });

  it("does nothing when balls aren't touching", () => {
    const world = createWorld();
    const a = spawn(world, { dynamic: true, x: 0, y: 0, vx: 5, vy: 0, radius: 10 });
    const b = spawn(world, { dynamic: true, x: 100, y: 0, vx: -5, vy: 0, radius: 10 });
    ballCollisionSystem(world);
    expect(a.x).toBe(0);
    expect(b.x).toBe(100);
    expect(a.vx).toBe(5);
    expect(b.vx).toBe(-5);
  });

  it("is a no-op with fewer than two dynamic entities", () => {
    const world = createWorld();
    const a = spawn(world, { dynamic: true, x: 0, y: 0, vx: 5, vy: 0, radius: 10 });
    expect(() => ballCollisionSystem(world)).not.toThrow();
    expect(a.x).toBe(0);
  });
});

describe("integrateSystem", () => {
  it("advances position by velocity * dt", () => {
    const world = createWorld();
    const e = spawn(world, { dynamic: true, x: 0, y: 0, vx: 10, vy: -20 });
    integrateSystem(world, 0.5);
    expect(e.x).toBe(5);
    expect(e.y).toBe(-10);
  });
});

describe("deformationSystem", () => {
  it("springs scale back toward 1, damped by existing scale velocity", () => {
    const world = createWorld();
    const e = spawn(world, { scaleX: 1, scaleY: 1, scaleVelX: -5, scaleVelY: 3 });
    deformationSystem(world, 0.01);
    // forceX = (1-1)*120 - (-5)*12 = 60 -> scaleVelX = -5 + 0.6 = -4.4 -> scaleX = 1 - 0.044
    expect(e.scaleVelX).toBeCloseTo(-4.4);
    expect(e.scaleX).toBeCloseTo(0.956);
    // forceY = (1-1)*120 - 3*12 = -36 -> scaleVelY = 3 - 0.36 = 2.64 -> scaleY = 1 + 0.0264
    expect(e.scaleVelY).toBeCloseTo(2.64);
    expect(e.scaleY).toBeCloseTo(1.0264);
  });
});

describe("renderSystem", () => {
  it("writes a translate+scale transform to the entity's element", () => {
    const world = createWorld();
    const calls = [];
    const el = { setAttribute: (name, value) => calls.push([name, value]) };
    spawn(world, { el, x: 10, y: 20, scaleX: 1.1, scaleY: 0.9 });
    renderSystem(world);
    expect(calls).toEqual([["transform", "translate(10 20) scale(1.1 0.9)"]]);
  });
});
