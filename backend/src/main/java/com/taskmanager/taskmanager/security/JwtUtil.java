package com.taskmanager.taskmanager.security;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Component
@SuppressWarnings("unused")
public class JwtUtil {

    private static final String SECRET = "taskmanager-jwt-secret-key-must-be-at-least-32-bytes";
    private static final long EXPIRATION_TIME = 1000 * 60 * 60 * 24;
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    public String generateToken(String email)  {
        long now = System.currentTimeMillis();
        long expiry = now + EXPIRATION_TIME;

        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payload = "{\"sub\":\"" + escapeJson(email) + "\",\"iat\":" + now + ",\"exp\":" + expiry + "}";
        String unsignedToken = base64UrlEncode(header) + "." + base64UrlEncode(payload);

        return unsignedToken + "." + sign(unsignedToken);
    }

    public String extractEmail(String token) {
        String payload = decodePayload(token);
        return extractStringClaim(payload, "sub");
    }

    public boolean isTokenValid(String token, String email) {
        return isSignatureValid(token) && email.equals(extractEmail(token)) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        String payload = decodePayload(token);
        long expiry = Long.parseLong(extractNumberClaim(payload, "exp"));
        return expiry < System.currentTimeMillis();
    }

    private boolean isSignatureValid(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return false;
        }

        String unsignedToken = parts[0] + "." + parts[1];
        return sign(unsignedToken).equals(parts[2]);
    }

    private String decodePayload(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new IllegalArgumentException("Invalid JWT token");
        }

        return new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec key = new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(key);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Could not sign JWT token", ex);
        }
    }

    private String base64UrlEncode(String value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private String extractStringClaim(String json, String claimName) {
        String key = "\"" + claimName + "\":\"";
        int start = json.indexOf(key);
        if (start == -1) {
            throw new IllegalArgumentException("Missing JWT claim: " + claimName);
        }

        start += key.length();
        int end = json.indexOf("\"", start);
        return json.substring(start, end).replace("\\\"", "\"").replace("\\\\", "\\");
    }

    private String extractNumberClaim(String json, String claimName) {
        String key = "\"" + claimName + "\":";
        int start = json.indexOf(key);
        if (start == -1) {
            throw new IllegalArgumentException("Missing JWT claim: " + claimName);
        }

        start += key.length();
        int end = start;
        while (end < json.length() && Character.isDigit(json.charAt(end))) {
            end++;
        }

        return json.substring(start, end);
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    public String generateToken(String email, String role) {
        long now = System.currentTimeMillis();
        long expiry = now + EXPIRATION_TIME;

        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payload = "{\"sub\":\"" + escapeJson(email) + "\",\"role\":\"" + escapeJson(role)
                + "\",\"iat\":" + now + ",\"exp\":" + expiry + "}";
        String unsignedToken = base64UrlEncode(header) + "." + base64UrlEncode(payload);

        return unsignedToken + "." + sign(unsignedToken);
    }

    public String extractRole(String token) {
        String payload = decodePayload(token);
        return extractStringClaim(payload, "role");
    }
}
