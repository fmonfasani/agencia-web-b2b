import { hashPassword, verifyPassword } from "../password";

describe("Password Utils", () => {
    it("should hash and verify passwords correctly", () => {
        const password = "test-password-123";
        const hash = hashPassword(password);

        expect(hash).toBeDefined();
        expect(hash).not.toEqual(password);

        const isValid = verifyPassword(password, hash);
        expect(isValid).toBe(true);

        const isInvalid = verifyPassword("wrong-password", hash);
        expect(isInvalid).toBe(false);
    });

    it("should generate different hashes for the same password due to random salt", () => {
        const password = "same-password";
        const hash1 = hashPassword(password);
        const hash2 = hashPassword(password);

        expect(hash1).not.toEqual(hash2);
        expect(verifyPassword(password, hash1)).toBe(true);
        expect(verifyPassword(password, hash2)).toBe(true);
    });
});
