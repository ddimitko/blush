package com.ddimitko.beautyhub.dto

import com.ddimitko.beautyhub.enums.BusinessType

class ShopSummaryDTO {
    UUID id
    String name
    String address
    String city
    String state
    String postalCode
    String country
    String phone
    String email
    String website
    String description
    Set<BusinessType> businessTypes
    Float ratingAverage
    Integer ratingCount
    Boolean acceptsCardPayments
    String thumbnail
    List<String> gallery
    
    static ShopSummaryDTO fromShop(shop) {
        return new ShopSummaryDTO(
            id: shop.id,
            name: shop.name,
            address: shop.address,
            city: shop.city,
            state: shop.state,
            postalCode: shop.postalCode,
            country: shop.country,
            phone: shop.phone,
            email: shop.email,
            website: shop.website,
            description: shop.description,
            businessTypes: shop.businessTypes,
            ratingAverage: shop.ratingAverage,
            ratingCount: shop.ratingCount,
            acceptsCardPayments: shop.acceptsCardPayments,
            thumbnail: shop.thumbnail,
            gallery: shop.gallery ?: []
        )
    }
}
