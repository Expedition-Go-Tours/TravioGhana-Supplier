import { describe, it, expect } from "vitest";
import {
  clampLatLng,
  edgeMidpoint,
  insertVertex,
  nudgeVertex,
  translateShape,
  deleteVertex,
  beginEdgeDrag,
  nearestEditHandle,
} from "@/lib/pickupShapeEdit";

describe("clampLatLng", () => {
  it("clamps latitude to [-90, 90]", () => {
    expect(clampLatLng([95, 0])).toEqual([90, 0]);
    expect(clampLatLng([-95, 0])).toEqual([-90, 0]);
  });

  it("normalizes longitude into (-180, 180]", () => {
    expect(clampLatLng([0, 185])).toEqual([0, -175]);
    expect(clampLatLng([0, -185])).toEqual([0, 175]);
    expect(clampLatLng([0, 180])).toEqual([0, 180]);
  });

  it("guards NaN/Infinity instead of corrupting the ring", () => {
    expect(clampLatLng([NaN, 5])).toEqual([0, 5]);
    expect(clampLatLng([5, Infinity])).toEqual([5, 0]);
  });
});

describe("edgeMidpoint", () => {
  const square = [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0],
  ];

  it("averages the two endpoints of an edge", () => {
    expect(edgeMidpoint(square, 0)).toEqual([0, 0.5]);
    expect(edgeMidpoint(square, 1)).toEqual([0.5, 1]);
  });

  it("wraps the last edge back to the first vertex", () => {
    expect(edgeMidpoint(square, 3)).toEqual([0.5, 0]);
  });
});

describe("insertVertex", () => {
  const square = [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0],
  ];

  it("inserts mid-ring without mutating the input", () => {
    const next = insertVertex(square, 2, [0.5, 0.5]);
    expect(next).toHaveLength(5);
    expect(next[2]).toEqual([0.5, 0.5]);
    expect(square).toHaveLength(4);
  });

  it("appends when the index equals the ring length", () => {
    const next = insertVertex(square, square.length, [9, 9]);
    expect(next).toHaveLength(5);
    expect(next[4]).toEqual([9, 9]);
  });

  it("clamps out-of-range indices", () => {
    expect(insertVertex(square, -5, [7, 7])[0]).toEqual([7, 7]);
    expect(insertVertex(square, 999, [7, 7])).toHaveLength(5);
  });
});

describe("beginEdgeDrag", () => {
  it("inserts the edge midpoint as a new vertex right after the edge start", () => {
    const triangle = [
      [0, 0],
      [0, 1],
      [1, 0],
    ];
    const { vertices, insertedIndex } = beginEdgeDrag(triangle, 0);
    expect(insertedIndex).toBe(1);
    expect(vertices).toHaveLength(4);
    expect(vertices[1]).toEqual([0, 0.5]);
  });

  it("handles the wrapping last edge", () => {
    const triangle = [
      [0, 0],
      [0, 1],
      [1, 0],
    ];
    const { vertices, insertedIndex } = beginEdgeDrag(triangle, 2);
    expect(insertedIndex).toBe(3);
    expect(vertices).toHaveLength(4);
    expect(vertices[3]).toEqual([0.5, 0]);
  });
});

describe("nearestEditHandle", () => {
  // A square: corners at (0,0)..(1,1), edge midpoints at (0.5,0) etc.
  const proj = {
    verts: [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
    ],
    mids: [
      { x: 0, y: 5 },
      { x: 5, y: 10 },
      { x: 10, y: 5 },
      { x: 5, y: 0 },
    ],
  };

  it("grabs a vertex when the pointer is on a corner", () => {
    expect(nearestEditHandle(proj, { x: 0, y: 0 })).toEqual({ kind: "vertex", index: 0 });
  });

  it("grabs the edge midpoint when the pointer is on an edge", () => {
    expect(nearestEditHandle(proj, { x: 5, y: 0 })).toEqual({ kind: "mid", index: 3 });
  });

  it("returns null outside every hit radius", () => {
    expect(nearestEditHandle(proj, { x: 50, y: 50 })).toBeNull();
  });

  it("prefers the closest handle when corners and mids overlap", () => {
    // Pointer sits closer to the mid (edge) dot than to either corner — a
    // dense-shape scenario (e.g. a 32-point circle) where the mid MUST win.
    const dense = {
      verts: [
        { x: 0, y: 0 },
        { x: 0, y: 2 },
      ],
      mids: [{ x: 0, y: 1 }],
    };
    expect(nearestEditHandle(dense, { x: 0, y: 1.1 })).toEqual({ kind: "mid", index: 0 });
  });

  it("respects a corner that is genuinely closer than the edge dot", () => {
    const nearCorner = {
      verts: [{ x: 0, y: 0 }],
      mids: [{ x: 0, y: 1 }],
    };
    expect(nearestEditHandle(nearCorner, { x: 0, y: 0.4 })).toEqual({ kind: "vertex", index: 0 });
  });
});

describe("nudgeVertex / translateShape", () => {
  it("moves only the target vertex without mutating input", () => {
    const square = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ];
    const next = nudgeVertex(square, 1, 0.1, -0.2);
    expect(next[1]).toEqual([0.1, 0.8]);
    expect(square[1]).toEqual([0, 1]);
  });

  it("translates every vertex", () => {
    const square = [
      [0, 0],
      [1, 1],
    ];
    expect(translateShape(square, 0.5, -0.5)).toEqual([
      [0.5, -0.5],
      [1.5, 0.5],
    ]);
  });
});

describe("deleteVertex", () => {
  it("removes the vertex at the given index", () => {
    const poly = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ];
    expect(deleteVertex(poly, 1)).toEqual([
      [0, 0],
      [1, 1],
      [1, 0],
    ]);
  });

  it("never drops below 3 vertices", () => {
    const tri = [
      [0, 0],
      [0, 1],
      [1, 0],
    ];
    expect(deleteVertex(tri, 0)).toHaveLength(3);
  });
});
