package com.ddimitko.beautyhub.dto

class OAuth2AuthResponse {

    String token
    String refreshToken
    String type = "Bearer"
    UUID id
    String email
    String firstName
    String lastName
    String phone
    String avatar
    List<String> roles
    boolean isNewUser = false
    String provider

    OAuth2AuthResponse(String token, String refreshToken, UUID id, String email, String firstName, String lastName,
                      String phone, String avatar, List<String> roles, boolean isNewUser, String provider) {
        this.token = token
        this.refreshToken = refreshToken
        this.id = id
        this.email = email
        this.firstName = firstName
        this.lastName = lastName
        this.phone = phone
        this.avatar = avatar
        this.roles = roles
        this.isNewUser = isNewUser
        this.provider = provider
    }
}
