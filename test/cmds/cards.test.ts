/// <reference types="vitest" />
import { describe, it, expect, vi } from "vitest";
import { cardsCommand } from "../../src/cmds/cards";
import chalk from "chalk";
import { initializeApi } from "../../src/index.ts";

vi.mock("../../src/index.ts", () => ({
  initializeApi: vi.fn(),
  credentials: {},
}));

const mockApi = {
  getCards: vi.fn(),
};

(initializeApi as vi.Mock).mockResolvedValue(mockApi);

describe("cardsCommand", () => {
  it("should fetch and display cards correctly", async () => {
    const options = {
      host: "test-host",
      apiKey: "test-api-key",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      credentialsFile: "test-credentials-file",
      verbose: false,
    };

    const mockCards = [
      {
        CardKey: "123",
        CardNumber: "4567 8901 2345 6789",
        IsProgrammable: true,
      },
      {
        CardKey: "456",
        CardNumber: "9876 5432 1098 7654",
        IsProgrammable: false,
      },
    ];

    mockApi.getCards.mockResolvedValue({ data: { cards: mockCards } });

    console.log = vi.fn();

    await cardsCommand(options);

    expect(console.log).toHaveBeenCalledWith("💳 fetching cards");
    expect(console.log).toHaveBeenCalledWith("");
    expect(console.log).toHaveBeenCalledWith(
      "CardKey | CardNumber          | IsProgrammable",
    );
    expect(console.log).toHaveBeenCalledWith(
      "----------------------------------------------",
    );
    expect(console.log).toHaveBeenCalledWith(
      "123     | 4567 8901 2345 6789 | true          ",
    );
    expect(console.log).toHaveBeenCalledWith(
      "456     | 9876 5432 1098 7654 | false         ",
    );
    expect(console.log).toHaveBeenCalledWith("");
  });

  it("should handle no cards found", async () => {
    const options = {
      host: "test-host",
      apiKey: "test-api-key",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      credentialsFile: "test-credentials-file",
      verbose: false,
    };

    mockApi.getCards.mockResolvedValue({ data: { cards: null } });

    console.log = vi.fn();

    await cardsCommand(options);

    expect(console.log).toHaveBeenCalledWith("💳 fetching cards");
    expect(console.log).toHaveBeenCalledWith("");
    expect(console.log).toHaveBeenCalledWith("No cards found");
  });

  it("should handle errors gracefully", async () => {
    const options = {
      host: "test-host",
      apiKey: "test-api-key",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      credentialsFile: "test-credentials-file",
      verbose: true,
    };

    const error = new Error("Test error");
    mockApi.getCards.mockRejectedValue(error);

    console.error = vi.fn();

    await cardsCommand(options);

    expect(console.error).toHaveBeenCalledWith(
      chalk.redBright("Failed to fetch cards:"),
      error.message,
    );
    expect(console.error).toHaveBeenCalledWith(error);
  });
});
