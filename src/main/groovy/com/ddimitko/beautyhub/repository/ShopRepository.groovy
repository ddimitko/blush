package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.enums.BusinessType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface ShopRepository extends JpaRepository<Shop, UUID> {

    List<Shop> findByOwner(User owner)

    @Query("SELECT s FROM Shop s WHERE s.id = :id AND s.owner.id = :ownerId")
    Optional<Shop> findByIdAndOwnerId(@Param("id") UUID id, @Param("ownerId") UUID ownerId)

    @Query("SELECT DISTINCT s FROM Shop s LEFT JOIN FETCH s.gallery WHERE s.owner = :owner")
    List<Shop> findByOwnerWithGallery(@Param("owner") User owner)

    @Query("SELECT DISTINCT s FROM Shop s LEFT JOIN FETCH s.gallery WHERE s.id = :id")
    Optional<Shop> findByIdWithGallery(@Param("id") UUID id)

    @Query(value = """
        SELECT DISTINCT s.* FROM shops s
        INNER JOIN shop_stripe_details ssd ON s.id = ssd.shop_id
        WHERE s.id = :id
        AND s.active = true
        AND ssd.subscription_id IS NOT NULL
    """, nativeQuery = true)
    Optional<Shop> findActiveShopById(@Param("id") UUID id)

    @Query("SELECT DISTINCT s FROM Shop s " +
           "LEFT JOIN FETCH s.gallery " +
           "LEFT JOIN FETCH s.businessTypes " +
           "JOIN s.stripeDetails sd " +
           "WHERE s.id = :id " +
           "AND s.active = true " +
           "AND sd.subscriptionId IS NOT NULL")
    Optional<Shop> findActiveShopByIdWithGallery(@Param("id") UUID id)

    List<Shop> findByActiveTrue()

    Page<Shop> findByActiveTrue(Pageable pageable)

    List<Shop> findByFeaturedTrueAndActiveTrue()

    List<Shop> findByBusinessTypesContaining(BusinessType businessType)

    @Query(value = """
        SELECT DISTINCT s.* FROM shops s
        INNER JOIN shop_stripe_details ssd ON s.id = ssd.shop_id
        LEFT JOIN shop_business_types sbt ON s.id = sbt.shop_id
        WHERE s.active = true
        AND ssd.subscription_id IS NOT NULL
        AND sbt.business_type = :businessType
    """, nativeQuery = true)
    List<Shop> findByBusinessTypesContainingAndActiveTrue(@Param("businessType") String businessType)

    @Query(value = """
        SELECT DISTINCT s.* FROM shops s
        INNER JOIN shop_stripe_details ssd ON s.id = ssd.shop_id
        WHERE s.active = true
        AND ssd.subscription_id IS NOT NULL
        AND LOWER(CAST(s.name AS TEXT)) LIKE LOWER(CONCAT('%', :name, '%'))
    """, nativeQuery = true)
    List<Shop> findByNameContainingIgnoreCaseAndActiveTrue(@Param("name") String name)

    @Query(value = """
        SELECT DISTINCT s.* FROM shops s
        INNER JOIN shop_stripe_details ssd ON s.id = ssd.shop_id
        WHERE s.active = true
        AND ssd.subscription_id IS NOT NULL
        AND LOWER(CAST(s.city AS TEXT)) LIKE LOWER(CONCAT('%', :city, '%'))
    """, nativeQuery = true)
    List<Shop> findByCityContainingIgnoreCaseAndActiveTrue(@Param("city") String city)

    @Query(value = """
        SELECT DISTINCT s.* FROM shops s
        INNER JOIN shop_stripe_details ssd ON s.id = ssd.shop_id
        WHERE s.active = true
        AND ssd.subscription_id IS NOT NULL
        AND s.rating_average >= :minRating
    """, nativeQuery = true)
    List<Shop> findByRatingAverageGreaterThanEqualAndActiveTrue(@Param("minRating") Double minRating)

    @Query(value = """
        SELECT DISTINCT s.* FROM shops s
        INNER JOIN shop_stripe_details ssd ON s.id = ssd.shop_id
        WHERE s.active = true
        AND ssd.subscription_id IS NOT NULL
        AND s.accepts_card_payments = :acceptsCard
    """, nativeQuery = true)
    List<Shop> findByAcceptsCardPaymentsAndActiveTrue(@Param("acceptsCard") Boolean acceptsCard)

    @Query(value = """
        SELECT DISTINCT s.* FROM shops s
        INNER JOIN shop_stripe_details ssd ON s.id = ssd.shop_id
        LEFT JOIN shop_business_types sbt ON s.id = sbt.shop_id
        WHERE s.active = true
        AND ssd.subscription_id IS NOT NULL
        AND (:name IS NULL OR LOWER(CAST(s.name AS TEXT)) LIKE LOWER(CONCAT('%', :name, '%')))
        AND (:city IS NULL OR LOWER(CAST(s.city AS TEXT)) LIKE LOWER(CONCAT('%', :city, '%')))
        AND (:minRating IS NULL OR s.rating_average >= :minRating)
        AND (:acceptsCard IS NULL OR s.accepts_card_payments = :acceptsCard)
        AND (COALESCE(array_length(CAST(:businessTypes AS text[]), 1), 0) = 0 OR sbt.business_type = ANY(CAST(:businessTypes AS text[])))
        ORDER BY s.rating_average DESC, s.name ASC
        LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
    List<Shop> findShopsWithFiltersNative(
        @Param("name") String name,
        @Param("city") String city,
        @Param("minRating") Double minRating,
        @Param("acceptsCard") Boolean acceptsCard,
        @Param("businessTypes") String[] businessTypes,
        @Param("limit") int limit,
        @Param("offset") int offset
    )

    @Query(value = """
        SELECT COUNT(DISTINCT s.id) FROM shops s
        INNER JOIN shop_stripe_details ssd ON s.id = ssd.shop_id
        LEFT JOIN shop_business_types sbt ON s.id = sbt.shop_id
        WHERE s.active = true
        AND ssd.subscription_id IS NOT NULL
        AND (:name IS NULL OR LOWER(CAST(s.name AS TEXT)) LIKE LOWER(CONCAT('%', :name, '%')))
        AND (:city IS NULL OR LOWER(CAST(s.city AS TEXT)) LIKE LOWER(CONCAT('%', :city, '%')))
        AND (:minRating IS NULL OR s.rating_average >= :minRating)
        AND (:acceptsCard IS NULL OR s.accepts_card_payments = :acceptsCard)
        AND (COALESCE(array_length(CAST(:businessTypes AS text[]), 1), 0) = 0 OR sbt.business_type = ANY(CAST(:businessTypes AS text[])))
    """, nativeQuery = true)
    long countShopsWithFilters(
        @Param("name") String name,
        @Param("city") String city,
        @Param("minRating") Double minRating,
        @Param("acceptsCard") Boolean acceptsCard,
        @Param("businessTypes") String[] businessTypes
    )

    // Geolocation-based search with distance calculation
    @Query(value = """
        SELECT DISTINCT s.*,
        (6371 * acos(cos(radians(:latitude)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(:longitude)) +
        sin(radians(:latitude)) * sin(radians(s.latitude)))) AS distance
        FROM shops s
        INNER JOIN shop_stripe_details ssd ON s.id = ssd.shop_id
        LEFT JOIN shop_business_types sbt ON s.id = sbt.shop_id
        WHERE s.active = true
        AND ssd.subscription_id IS NOT NULL
        AND s.latitude IS NOT NULL
        AND s.longitude IS NOT NULL
        AND (:name IS NULL OR LOWER(CAST(s.name AS TEXT)) LIKE LOWER(CONCAT('%', :name, '%')))
        AND (:city IS NULL OR LOWER(CAST(s.city AS TEXT)) LIKE LOWER(CONCAT('%', :city, '%')))
        AND (:minRating IS NULL OR s.rating_average >= :minRating)
        AND (:acceptsCard IS NULL OR s.accepts_card_payments = :acceptsCard)
        AND (COALESCE(array_length(CAST(:businessTypes AS text[]), 1), 0) = 0 OR sbt.business_type = ANY(CAST(:businessTypes AS text[])))
        AND (:maxDistance IS NULL OR (6371 * acos(cos(radians(:latitude)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(:longitude)) +
        sin(radians(:latitude)) * sin(radians(s.latitude)))) <= :maxDistance)
        ORDER BY distance ASC, s.rating_average DESC
        LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
    List<Shop> findShopsWithLocationAndFiltersNative(
        @Param("latitude") Double latitude,
        @Param("longitude") Double longitude,
        @Param("maxDistance") Double maxDistance,
        @Param("name") String name,
        @Param("city") String city,
        @Param("minRating") Double minRating,
        @Param("acceptsCard") Boolean acceptsCard,
        @Param("businessTypes") String[] businessTypes,
        @Param("limit") int limit,
        @Param("offset") int offset
    )

    @Query(value = """
        SELECT COUNT(DISTINCT s.id)
        FROM shops s
        INNER JOIN shop_stripe_details ssd ON s.id = ssd.shop_id
        LEFT JOIN shop_business_types sbt ON s.id = sbt.shop_id
        WHERE s.active = true
        AND ssd.subscription_id IS NOT NULL
        AND s.latitude IS NOT NULL
        AND s.longitude IS NOT NULL
        AND (:name IS NULL OR LOWER(CAST(s.name AS TEXT)) LIKE LOWER(CONCAT('%', :name, '%')))
        AND (:city IS NULL OR LOWER(CAST(s.city AS TEXT)) LIKE LOWER(CONCAT('%', :city, '%')))
        AND (:minRating IS NULL OR s.rating_average >= :minRating)
        AND (:acceptsCard IS NULL OR s.accepts_card_payments = :acceptsCard)
        AND (COALESCE(array_length(CAST(:businessTypes AS text[]), 1), 0) = 0 OR sbt.business_type = ANY(CAST(:businessTypes AS text[])))
        AND (:maxDistance IS NULL OR (6371 * acos(cos(radians(:latitude)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(:longitude)) +
        sin(radians(:latitude)) * sin(radians(s.latitude)))) <= :maxDistance)
    """, nativeQuery = true)
    long countShopsWithLocationAndFilters(
        @Param("latitude") Double latitude,
        @Param("longitude") Double longitude,
        @Param("maxDistance") Double maxDistance,
        @Param("name") String name,
        @Param("city") String city,
        @Param("minRating") Double minRating,
        @Param("acceptsCard") Boolean acceptsCard,
        @Param("businessTypes") String[] businessTypes
    )

    @Query("SELECT COUNT(s) FROM Shop s WHERE s.active = true")
    long countActiveShops()

    @Query("SELECT COUNT(s) FROM Shop s WHERE s.owner = :owner")
    long countByOwner(@Param("owner") User owner)

    @Query("SELECT s FROM Shop s JOIN s.stripeDetails sd WHERE sd.stripeAccountId IS NOT NULL AND sd.stripeOnboardingCompleted = false")
    List<Shop> findShopsWithIncompleteStripeOnboarding()
}
