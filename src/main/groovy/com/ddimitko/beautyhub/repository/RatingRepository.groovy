package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.entity.Rating
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface RatingRepository extends JpaRepository<Rating, UUID> {

    // Find ratings by appointment
    Optional<Rating> findByAppointment(Appointment appointment)

    Optional<Rating> findByUserAndAppointment(User user, Appointment appointment)

    boolean existsByAppointment(Appointment appointment)

    // Find ratings by user
    List<Rating> findByUser(User user)

    // Find ratings for a shop (through appointments)
    @Query("SELECT r FROM Rating r WHERE r.appointment.shop = :shop ORDER BY r.createdAt DESC")
    List<Rating> findByShopOrderByCreatedAtDesc(@Param("shop") Shop shop)

    @Query("SELECT r FROM Rating r WHERE r.appointment.shop = :shop")
    Page<Rating> findByShop(@Param("shop") Shop shop, Pageable pageable)

    // Shop rating calculations
    @Query("SELECT AVG(r.stars) FROM Rating r WHERE r.appointment.shop = :shop")
    Double findAverageRatingByShop(@Param("shop") Shop shop)

    @Query("SELECT COUNT(r) FROM Rating r WHERE r.appointment.shop = :shop")
    long countByShop(@Param("shop") Shop shop)

    @Query("SELECT COUNT(r) FROM Rating r WHERE r.appointment.shop = :shop AND r.stars = :stars")
    long countByShopAndStars(@Param("shop") Shop shop, @Param("stars") Integer stars)
}
