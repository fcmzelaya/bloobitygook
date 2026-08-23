import { describe, it, expect, vi } from "vitest";
import { createActionDispatcher } from "../src/dispatch.js";

describe("createActionDispatcher", () => {
  it("calls the handler bound to the given action name, forwarding args", () => {
    const moveLeft = vi.fn().mockReturnValue("moved");
    const dispatch = createActionDispatcher({ controls: { moveLeft } });
    const result = dispatch("moveLeft", 1, 2);
    expect(moveLeft).toHaveBeenCalledWith(1, 2);
    expect(result).toBe("moved");
  });

  it("silently no-ops for an action with no bound handler", () => {
    const dispatch = createActionDispatcher({ controls: {} });
    expect(() => dispatch("somethingUnbound")).not.toThrow();
  });

  it("keeps different actions independent", () => {
    const moveLeft = vi.fn();
    const rotate = vi.fn();
    const dispatch = createActionDispatcher({ controls: { moveLeft, rotate } });
    dispatch("rotate");
    expect(rotate).toHaveBeenCalledTimes(1);
    expect(moveLeft).not.toHaveBeenCalled();
  });
});
