package vn.edu.fpt.doghandbook.backend.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.exception.ErrorCode;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> {})
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/login", "/error").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/media/*/file").permitAll()

                        .requestMatchers(HttpMethod.PUT, "/auth/change-password").hasRole("ADMIN")

                        .requestMatchers("/notifications/**").authenticated()

                        .requestMatchers("/users/**").hasRole("ADMIN")
                        .requestMatchers("/audit-logs/**").hasRole("ADMIN")
                        .requestMatchers("/system-settings/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/dogs", "/dogs/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/dogs").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/dogs/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/dogs/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.DELETE, "/field-notes/**").hasAnyRole("ADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.DELETE, "/media/**").hasAnyRole("ADMIN", "CONTENT_EDITOR")

                        .requestMatchers(HttpMethod.GET, "/enrollments/**").hasAnyRole("ADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.POST, "/enrollments/**").hasAnyRole("ADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.PUT, "/enrollments/**").hasAnyRole("ADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.DELETE, "/enrollments/**").hasAnyRole("ADMIN", "TRAINER")

                        .requestMatchers(HttpMethod.DELETE, "/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/breeds/compare").authenticated()

                        .requestMatchers(HttpMethod.POST, "/contents/*/review")
                        .hasAnyRole("ADMIN", "REVIEWER")

                        .requestMatchers(HttpMethod.PUT,
                                "/approvals/*/*/publish", "/approvals/*/*/unpublish"
                        ).hasAnyRole("ADMIN", "CONTENT_EDITOR")

                        .requestMatchers(HttpMethod.PUT, "/contents/*/publish")
                        .hasAnyRole("ADMIN", "CONTENT_EDITOR")

                        .requestMatchers(HttpMethod.PUT, "/contents/*/unpublish")
                        .hasAnyRole("ADMIN", "CONTENT_EDITOR")

                        .requestMatchers(HttpMethod.PUT, "/medications/*/publish", "/medications/*/unpublish")
                        .hasAnyRole("ADMIN", "CONTENT_EDITOR")

                        .requestMatchers(HttpMethod.PUT, "/first-aid-guides/*/publish", "/first-aid-guides/*/unpublish")
                        .hasAnyRole("ADMIN", "CONTENT_EDITOR")

                        .requestMatchers(HttpMethod.PUT, "/suggestions/*/respond")
                        .hasAnyRole("ADMIN", "CONTENT_EDITOR")

                        .requestMatchers(HttpMethod.POST, "/suggestions/**")
                        .hasAnyRole("TRAINER", "ADMIN", "CONTENT_EDITOR")

                        .requestMatchers(HttpMethod.POST,
                                "/breeds/**", "/exercises/**", "/training-methods/**", "/roadmaps/**",
                                "/diseases/**", "/symptoms/**", "/medications/**", "/first-aid-guides/**",
                                "/nutrition-standards/**", "/contents/**", "/media/**"
                        ).hasAnyRole("ADMIN", "CONTENT_EDITOR")

                        .requestMatchers(HttpMethod.PUT,
                                "/breeds/**", "/exercises/**", "/training-methods/**", "/roadmaps/**",
                                "/diseases/**", "/symptoms/**", "/medications/**", "/first-aid-guides/**",
                                "/nutrition-standards/**", "/contents/**", "/media/**"
                        ).hasAnyRole("ADMIN", "CONTENT_EDITOR")

                        .requestMatchers("/contents/*/approve", "/contents/*/reject")
                                .hasAnyRole("ADMIN", "REVIEWER")

                        .requestMatchers(HttpMethod.POST, "/assignments/**").hasAnyRole("ADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.PUT, "/assignments/**").hasAnyRole("ADMIN", "TRAINER")

                        .requestMatchers(HttpMethod.POST, "/health-records").hasAnyRole("ADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.PUT, "/health-records/**").hasAnyRole("ADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.GET, "/health-records", "/health-records/**").authenticated()

                        .requestMatchers(HttpMethod.POST, "/dog-weight-records").hasAnyRole("ADMIN", "TRAINER")

                        .requestMatchers("/health-sessions/**").hasAnyRole("ADMIN", "TRAINER")

                        .requestMatchers("/sync/**").hasAnyRole("ADMIN", "TRAINER")

                        .requestMatchers("/import/**").hasAnyRole("ADMIN", "CONTENT_EDITOR")
                        .requestMatchers("/export/**").hasAnyRole("ADMIN", "CONTENT_EDITOR")

                        .requestMatchers(
                                "/field-notes/**", "/reports/**",
                                "/dogs/*/health-records/**", "/weight-assessment/**"
                        ).hasAnyRole("ADMIN", "TRAINER")

                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                writeErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, ErrorCode.UNAUTHORIZED))
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                writeErrorResponse(response, HttpServletResponse.SC_FORBIDDEN, ErrorCode.ACCESS_DENIED))
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void writeErrorResponse(HttpServletResponse response, int status, ErrorCode errorCode)
            throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        String json = String.format(
                "{\"success\":false,\"errorCode\":\"%s\",\"message\":\"%s\",\"timestamp\":\"%s\"}",
                errorCode.name(),
                errorCode.getDefaultMessage(),
                java.time.LocalDateTime.now()
        );
        response.getWriter().write(json);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
