package com.ddimitko.beautyhub.security

import com.ddimitko.beautyhub.config.JwtConfig
import jakarta.servlet.FilterChain
import jakarta.servlet.ServletException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.util.StringUtils
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtConfig jwtConfig

    @Autowired
    private CustomUserDetailsService customUserDetailsService

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request)

            if (StringUtils.hasText(jwt) && jwtConfig.validateToken(jwt)) {
                String userEmail = jwtConfig.extractUsername(jwt)

                try {
                    // Load user details and verify user still exists
                    UserDetails userDetails = customUserDetailsService.loadUserByUsername(userEmail)

                    // Additional validation: ensure token is valid for this specific user
                    if (jwtConfig.validateToken(jwt, userDetails)) {
                        UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities())
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request))

                        SecurityContextHolder.getContext().setAuthentication(authentication)

                        // Debug logging for schedule endpoint issues
                        if (request.getRequestURI().contains("/schedules/")) {
                            println("DEBUG JWT: User ${userEmail} authenticated for ${request.getRequestURI()}")
                            println("DEBUG JWT: User authorities: ${userDetails.getAuthorities().collect { it.getAuthority() }}")
                        }
                    }
                } catch (UsernameNotFoundException e) {
                    // User no longer exists in database - token is invalid
                    SecurityContextHolder.clearContext()
                }
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex)
        }

        filterChain.doFilter(request, response)
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization")
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7)
        }
        return null
    }
}
