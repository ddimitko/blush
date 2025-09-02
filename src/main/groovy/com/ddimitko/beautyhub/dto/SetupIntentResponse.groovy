package com.ddimitko.beautyhub.dto

import lombok.Data

@Data
class SetupIntentResponse {
    String setupIntentId
    String clientSecret
    String customerId
}
