package com.ddimitko.beautyhub.dto

import groovy.transform.ToString
import lombok.AllArgsConstructor
import lombok.Data
import lombok.NoArgsConstructor

import java.time.LocalDateTime

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
class GuestReviewResponse {

    UUID ratingId
    UUID appointmentId
    Integer stars
    String comment
    Boolean anonymous
    String imageUrl
    LocalDateTime createdAt
    String shopName
    String serviceName
    String employeeName
    
    // Account creation result (if guest chose to create account)
    Boolean accountCreated = false
    UUID userId
    String message
}
