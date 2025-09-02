package com.ddimitko.beautyhub.dto

import lombok.Data

@Data
class LoginResponse {
    String token
    String refreshToken
    String type = "Bearer"
    UUID id
    String email
    String firstName
    String lastName
    String avatar
    List<String> roles
}
