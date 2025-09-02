package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    List<Employee> findByUser(User user)

    Optional<Employee> findByUserAndShop(User user, Shop shop)

    List<Employee> findByShop(Shop shop)

    List<Employee> findByActiveTrue()

    List<Employee> findByShopAndActiveTrue(Shop shop)

    @Query("SELECT e FROM Employee e JOIN FETCH e.user WHERE e.shop = :shop AND e.active = true AND e.user.enabled = true")
    List<Employee> findActiveEmployeesByShop(@Param("shop") Shop shop)

    @Query("SELECT DISTINCT e FROM Employee e JOIN FETCH e.user LEFT JOIN FETCH e.serviceEmployees se LEFT JOIN FETCH se.service WHERE e.shop = :shop AND e.active = true AND e.user.enabled = true")
    List<Employee> findActiveEmployeesByShopWithServices(@Param("shop") Shop shop)

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.shop = :shop AND e.active = true")
    long countActiveEmployeesByShop(@Param("shop") Shop shop)

    boolean existsByUserAndShop(User user, Shop shop)

    @Query("SELECT e FROM Employee e WHERE e.user.id = :userId AND e.active = true")
    List<Employee> findByUserIdAndActiveTrue(@Param("userId") UUID userId)

    @Query("SELECT COUNT(e) > 0 FROM Employee e WHERE e.user.id = :userId AND e.shop.id = :shopId AND e.active = true")
    boolean existsByUserIdAndShopIdAndActiveTrue(@Param("userId") UUID userId, @Param("shopId") UUID shopId)

    @Query("SELECT e FROM Employee e JOIN FETCH e.user WHERE e.id = :id")
    Optional<Employee> findByIdWithUser(@Param("id") UUID id)

    @Query("SELECT e FROM Employee e JOIN FETCH e.user JOIN FETCH e.shop s JOIN FETCH s.owner WHERE e.id = :id")
    Optional<Employee> findByIdWithUserAndShop(@Param("id") UUID id)

    @Query("SELECT e FROM Employee e WHERE e.active = true")
    List<Employee> findAllActiveEmployees()
}
