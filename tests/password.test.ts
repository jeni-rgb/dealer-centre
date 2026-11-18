import { describe, expect, it } from "vitest";
import { PASSWORD_COPY, passwordIssue, passwordKind } from "@/lib/password";

const noDash = (s: string) => expect(s).not.toMatch(/[-–—]/);

describe("password", () => {
  it("asks for a password until one is saved, and always when it is temporary", () => {
    expect(passwordKind(null, null)).toBe("missing");
    expect(passwordKind({ password_set: true }, [{ method: "otp" }])).toBeNull();
    expect(passwordKind({}, [{ method: "password" }])).toBeNull();
    expect(passwordKind({ temp_password: true }, [{ method: "password" }])).toBe("temp");
    expect(passwordKind({ temp_password: true, password_set: true }, null)).toBe("temp");
    expect(passwordIssue("short", "short")).toBe("Use at least 8 characters.");
    expect(passwordIssue("longenough", "different")).toBe("Those passwords do not match.");
    expect(passwordIssue("longenough", "longenough")).toBeNull();
  });

  it("keeps the password copy free of dashes", () => {
    for (const line of Object.values(PASSWORD_COPY)) noDash(line);
  });
});
