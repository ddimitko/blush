package com.ddimitko.beautyhub.security

import com.ddimitko.beautyhub.entity.User
import com.fasterxml.jackson.annotation.JsonIgnore
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.oauth2.core.user.OAuth2User

class CustomUserPrincipal implements OAuth2User, UserDetails {
    private UUID id
    private String email
    private String firstName
    private String lastName
    
    @JsonIgnore
    private String password
    
    private Collection<? extends GrantedAuthority> authorities
    private Map<String, Object> attributes

    CustomUserPrincipal(UUID id, String email, String firstName, String lastName, String password, Collection<? extends GrantedAuthority> authorities) {
        this.id = id
        this.email = email
        this.firstName = firstName
        this.lastName = lastName
        this.password = password
        this.authorities = authorities
    }

    static CustomUserPrincipal create(User user) {
        List<GrantedAuthority> authorities = [new SimpleGrantedAuthority("ROLE_${user.role.name()}")]
        
        return new CustomUserPrincipal(
                user.id,
                user.email,
                user.firstName,
                user.lastName,
                user.password,
                authorities
        )
    }

    static CustomUserPrincipal create(User user, Map<String, Object> attributes) {
        CustomUserPrincipal userPrincipal = CustomUserPrincipal.create(user)
        userPrincipal.setAttributes(attributes)
        return userPrincipal
    }

    UUID getId() {
        return id
    }

    String getEmail() {
        return email
    }

    String getFirstName() {
        return firstName
    }

    String getLastName() {
        return lastName
    }

    String getFullName() {
        return "${firstName} ${lastName}".trim()
    }

    @Override
    String getPassword() {
        return password
    }

    @Override
    String getUsername() {
        return email
    }

    @Override
    boolean isAccountNonExpired() {
        return true
    }

    @Override
    boolean isAccountNonLocked() {
        return true
    }

    @Override
    boolean isCredentialsNonExpired() {
        return true
    }

    @Override
    boolean isEnabled() {
        return true
    }

    @Override
    Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities
    }

    @Override
    Map<String, Object> getAttributes() {
        return attributes
    }

    void setAttributes(Map<String, Object> attributes) {
        this.attributes = attributes
    }

    @Override
    String getName() {
        return String.valueOf(id)
    }
}
