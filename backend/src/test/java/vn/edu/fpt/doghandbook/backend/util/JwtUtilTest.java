package vn.edu.fpt.doghandbook.backend.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilTest {

    private static final String SECRET_KEY =
            "dhs-military-secret-key-2026-must-be-at-least-256-bits-long-for-hs256";

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secretKey", SECRET_KEY);
        ReflectionTestUtils.setField(jwtUtil, "expiration", 60_000L);
    }

    @Test
    void generateToken_validUser_returnsTokenContainingSubjectAndClaims() {
        User user = sampleUser();

        String token = jwtUtil.generateToken(user);
        Claims claims = ReflectionTestUtils.invokeMethod(jwtUtil, "getClaims", token);

        assertThat(token).isNotBlank();
        assertThat(claims.getSubject()).isEqualTo("trainer.alpha");
        assertThat(claims.get("userId", Integer.class)).isEqualTo(7);
        assertThat(claims.get("role", String.class)).isEqualTo("TRAINER");
        assertThat(claims.get("fullName", String.class)).isEqualTo("Trainer Alpha");
    }

    @Test
    void extractUsername_validToken_returnsUsername() {
        String token = jwtUtil.generateToken(sampleUser());

        String username = jwtUtil.extractUsername(token);

        assertThat(username).isEqualTo("trainer.alpha");
    }

    @Test
    void isTokenValid_matchingUsername_returnsTrue() {
        String token = jwtUtil.generateToken(sampleUser());

        boolean result = jwtUtil.isTokenValid(token, "trainer.alpha");

        assertThat(result).isTrue();
    }

    @Test
    void isTokenValid_differentUsername_returnsFalse() {
        String token = jwtUtil.generateToken(sampleUser());

        boolean result = jwtUtil.isTokenValid(token, "trainer.bravo");

        assertThat(result).isFalse();
    }

    @Test
    void isTokenExpired_unexpiredToken_returnsFalse() {
        String token = jwtUtil.generateToken(sampleUser());

        boolean result = jwtUtil.isTokenExpired(token);

        assertThat(result).isFalse();
    }

    @Test
    void extractUsername_expiredToken_throwsExpiredJwtException() {
        String token = Jwts.builder()
                .subject("trainer.alpha")
                .expiration(new Date(System.currentTimeMillis() - 1_000L))
                .signWith(jwtUtil.getSigningKey())
                .compact();

        assertThatThrownBy(() -> jwtUtil.extractUsername(token))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void isTokenValid_tokenSignedWithDifferentKey_throwsJwtException() {
        SecretKey differentKey = Keys.hmacShaKeyFor(
                "another-dhs-secret-key-2026-must-be-at-least-256-bits-long-hs256"
                        .getBytes(StandardCharsets.UTF_8)
        );
        String token = Jwts.builder()
                .subject("trainer.alpha")
                .expiration(new Date(System.currentTimeMillis() + 60_000L))
                .signWith(differentKey)
                .compact();

        assertThatThrownBy(() -> jwtUtil.isTokenValid(token, "trainer.alpha"))
                .isInstanceOf(JwtException.class);
    }

    private User sampleUser() {
        return User.builder()
                .userId(7)
                .username("trainer.alpha")
                .passwordHash("hash")
                .fullName("Trainer Alpha")
                .role(UserRole.TRAINER)
                .build();
    }
}
