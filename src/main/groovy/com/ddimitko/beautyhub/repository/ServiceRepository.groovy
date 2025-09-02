package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.Service
import com.ddimitko.beautyhub.entity.Shop
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface ServiceRepository extends JpaRepository<Service, UUID> {

    List<Service> findByEmployee(Employee employee)

    List<Service> findByShop(Shop shop)

    List<Service> findByActiveTrue()

    List<Service> findByEmployeeAndActiveTrue(Employee employee)

    List<Service> findByShopAndActiveTrue(Shop shop)

    @Query("SELECT s FROM Service s WHERE s.shop = :shop AND s.active = true AND s.onlineBookingEnabled = true")
    List<Service> findBookableServicesByShop(@Param("shop") Shop shop)

    @Query("SELECT s FROM Service s WHERE s.employee = :employee AND s.active = true AND s.onlineBookingEnabled = true")
    List<Service> findBookableServicesByEmployee(@Param("employee") Employee employee)

    @Query("SELECT s FROM Service s WHERE s.active = true AND LOWER(s.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Service> findByNameContainingIgnoreCaseAndActiveTrue(@Param("name") String name)

    @Query("SELECT s FROM Service s WHERE s.active = true AND s.category = :category")
    List<Service> findByCategoryAndActiveTrue(@Param("category") String category)

    @Query("SELECT s FROM Service s WHERE s.active = true AND s.price BETWEEN :minPrice AND :maxPrice")
    List<Service> findByPriceBetweenAndActiveTrue(@Param("minPrice") BigDecimal minPrice, @Param("maxPrice") BigDecimal maxPrice)

    @Query("SELECT DISTINCT s.category FROM Service s WHERE s.active = true AND s.category IS NOT NULL ORDER BY s.category")
    List<String> findDistinctCategories()

    @Query("SELECT COUNT(s) FROM Service s WHERE s.shop = :shop AND s.active = true")
    long countActiveServicesByShop(@Param("shop") Shop shop)

    @Query("SELECT COUNT(s) FROM Service s WHERE s.employee = :employee AND s.active = true")
    long countActiveServicesByEmployee(@Param("employee") Employee employee)

    @Query("SELECT s FROM Service s JOIN FETCH s.employee e JOIN FETCH e.user JOIN FETCH s.shop WHERE s.shop = :shop AND s.active = true")
    List<Service> findByShopAndActiveTrueWithEmployeeAndUser(@Param("shop") Shop shop)

    @Query("SELECT s FROM Service s JOIN FETCH s.employee e JOIN FETCH e.user JOIN FETCH s.shop WHERE s.employee = :employee AND s.active = true")
    List<Service> findByEmployeeAndActiveTrueWithEmployeeAndUser(@Param("employee") Employee employee)

    // Owner-facing query that shows ALL services (with and without employees)
    @Query("SELECT s FROM Service s LEFT JOIN FETCH s.employee e LEFT JOIN FETCH e.user JOIN FETCH s.shop WHERE s.shop = :shop")
    List<Service> findAllByShopWithEmployeeAndUser(@Param("shop") Shop shop)

    // Find service by ID with serviceEmployees relationship loaded
    @Query("SELECT s FROM Service s LEFT JOIN FETCH s.serviceEmployees se LEFT JOIN FETCH se.employee e LEFT JOIN FETCH e.user JOIN FETCH s.shop WHERE s.id = :serviceId")
    Optional<Service> findByIdWithServiceEmployees(@Param("serviceId") UUID serviceId)

    @Query("SELECT s FROM Service s WHERE s.shop = :shop AND LOWER(s.name) = LOWER(:name)")
    List<Service> findByShopAndNameIgnoreCase(@Param("shop") Shop shop, @Param("name") String name)

    // Customer-facing queries that only show active services with employees
    @Query("SELECT s FROM Service s JOIN s.serviceEmployees se WHERE s.shop = :shop AND s.active = true AND s.onlineBookingEnabled = true AND se.active = true")
    List<Service> findCustomerBookableServicesByShop(@Param("shop") Shop shop)

    @Query("SELECT s FROM Service s JOIN s.serviceEmployees se WHERE se.employee = :employee AND s.active = true AND s.onlineBookingEnabled = true AND se.active = true")
    List<Service> findCustomerBookableServicesByEmployee(@Param("employee") Employee employee)

    // Migration helper queries
    @Query("SELECT s FROM Service s WHERE s.employee IS NOT NULL")
    List<Service> findServicesWithLegacyEmployee()

    @Query("SELECT s FROM Service s WHERE s.employee IS NULL AND (s.serviceEmployees IS EMPTY OR SIZE(s.serviceEmployees) = 0)")
    List<Service> findServicesWithoutEmployees()
}
