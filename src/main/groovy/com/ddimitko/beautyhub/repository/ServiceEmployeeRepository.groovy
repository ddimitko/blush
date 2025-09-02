package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.Service
import com.ddimitko.beautyhub.entity.ServiceEmployee
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface ServiceEmployeeRepository extends JpaRepository<ServiceEmployee, UUID> {

    List<ServiceEmployee> findByService(Service service)

    List<ServiceEmployee> findByEmployee(Employee employee)

    List<ServiceEmployee> findByServiceAndActiveTrue(Service service)

    List<ServiceEmployee> findByEmployeeAndActiveTrue(Employee employee)

    @Query("SELECT se FROM ServiceEmployee se WHERE se.service = :service AND se.employee = :employee")
    Optional<ServiceEmployee> findByServiceAndEmployee(@Param("service") Service service, @Param("employee") Employee employee)

    @Query("SELECT se FROM ServiceEmployee se WHERE se.service = :service AND se.employee = :employee AND se.active = true")
    Optional<ServiceEmployee> findByServiceAndEmployeeAndActiveTrue(@Param("service") Service service, @Param("employee") Employee employee)

    void deleteByServiceAndEmployee(Service service, Employee employee)

    @Query("SELECT COUNT(se) FROM ServiceEmployee se WHERE se.service = :service AND se.active = true")
    long countActiveByService(@Param("service") Service service)

    @Query("SELECT COUNT(se) FROM ServiceEmployee se WHERE se.employee = :employee AND se.active = true")
    long countActiveByEmployee(@Param("employee") Employee employee)

    @Query("SELECT se FROM ServiceEmployee se JOIN FETCH se.employee e JOIN FETCH e.user WHERE se.service = :service AND se.active = true")
    List<ServiceEmployee> findActiveEmployeesByService(@Param("service") Service service)

    // Migration helper methods
    @Query("SELECT se FROM ServiceEmployee se WHERE se.service IS NULL OR se.employee IS NULL")
    List<ServiceEmployee> findOrphanedServiceEmployees()

    boolean existsByServiceAndEmployee(Service service, Employee employee)
    boolean existsByServiceAndEmployeeAndActiveTrue(Service service, Employee employee)
}
