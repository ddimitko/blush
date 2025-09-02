package com.ddimitko.beautyhub.config

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import io.jsonwebtoken.io.Decoders
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.stereotype.Component

import javax.crypto.SecretKey
import java.util.function.Function

@Component
class JwtConfig {

    @Value('${app.jwt.secret}')
    private String secret

    @Value('${app.jwt.expiration}')
    private Long expiration

    @Value('${app.jwt.refresh-expiration:604800000}')
    private long refreshExpiration

    private SecretKey getSigningKey() {
        try {
            // Try URL-safe base64 decoding first
            byte[] keyBytes = Decoders.BASE64URL.decode(this.secret);
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (Exception e) {
            try {
                // Fallback to standard base64 decoding
                byte[] keyBytes = Decoders.BASE64.decode(this.secret);
                return Keys.hmacShaKeyFor(keyBytes);
            } catch (Exception e2) {
                // If both fail, use the secret string directly as UTF-8 bytes
                byte[] keyBytes = this.secret.getBytes("UTF-8");
                // Ensure the key is at least 256 bits (32 bytes) for HS256
                if (keyBytes.length < 32) {
                    // Pad the key to 32 bytes
                    byte[] paddedKey = new byte[32];
                    System.arraycopy(keyBytes, 0, paddedKey, 0, Math.min(keyBytes.length, 32));
                    keyBytes = paddedKey;
                }
                return Keys.hmacShaKeyFor(keyBytes);
            }
        }
    }

    String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = [:]
        return createToken(claims, userDetails.getUsername())
    }

    String generateToken(UserDetails userDetails, Map<String, Object> extraClaims) {
        Map<String, Object> claims = [:]
        claims.putAll(extraClaims)
        return createToken(claims, userDetails.getUsername())
    }

    String generateToken(String username) {
        Map<String, Object> claims = [:]
        return createToken(claims, username)
    }

    private String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date()
        Date expiryDate = new Date(now.getTime() + expiration)

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact()
    }

    String generateRefreshToken(UserDetails userDetails) {
        Map<String, Object> claims = [:]
        claims.put("type", "refresh")
        return createRefreshToken(claims, userDetails.getUsername())
    }

    String generateRefreshToken(String username) {
        Map<String, Object> claims = [:]
        claims.put("type", "refresh")
        return createRefreshToken(claims, username)
    }

    private String createRefreshToken(Map<String, Object> claims, String subject) {
        Date now = new Date()
        Date expiryDate = new Date(now.getTime() + refreshExpiration)

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact()
    }

    String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject)
    }

    Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration)
    }

    def <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token)
        return claimsResolver.apply(claims)
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
    }

    // Extract claims from token without validating expiration (for refresh purposes)
    private Claims extractAllClaimsIgnoreExpiration(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            // Return the claims from the expired token
            return e.getClaims()
        }
    }

    // Extract username from token even if expired (for refresh purposes)
    String extractUsernameIgnoreExpiration(String token) {
        final Claims claims = extractAllClaimsIgnoreExpiration(token)
        return claims.getSubject()
    }

    Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date())
    }

    Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token)
        return (username == userDetails.getUsername() && !isTokenExpired(token))
    }

    Boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
            return true
        } catch (Exception e) {
            return false
        }
    }

    Long getExpirationTime() {
        return expiration
    }

    Long getRefreshExpirationTime() {
        return refreshExpiration
    }

    boolean isRefreshToken(String token) {
        try {
            Claims claims = extractAllClaims(token)
            return "refresh".equals(claims.get("type"))
        } catch (Exception e) {
            return false
        }
    }

    boolean validateRefreshToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token)
        return (username.equals(userDetails.getUsername()) &&
                !isTokenExpired(token) &&
                isRefreshToken(token))
    }

    boolean validateRefreshToken(String token) {
        try {
            Claims claims = extractAllClaims(token)
            return !isTokenExpired(token) && "refresh".equals(claims.get("type"))
        } catch (Exception e) {
            return false
        }
    }
}
