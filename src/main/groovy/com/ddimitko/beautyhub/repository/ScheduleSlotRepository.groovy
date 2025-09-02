package com.ddimitko.beautyhub.repository

import com.ddimitko.beautyhub.entity.Employee
import com.ddimitko.beautyhub.entity.ScheduleSlot
import com.ddimitko.beautyhub.enums.DayOfWeek
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

import java.time.LocalTime

@Repository
interface ScheduleSlotRepository extends JpaRepository<ScheduleSlot, UUID> {

    List<ScheduleSlot> findByEmployee(Employee employee)

    List<ScheduleSlot> findByEmployeeAndActiveTrue(Employee employee)

    List<ScheduleSlot> findByEmployeeAndDayOfWeek(Employee employee, DayOfWeek dayOfWeek)

    List<ScheduleSlot> findByEmployeeAndDayOfWeekAndActiveTrue(Employee employee, DayOfWeek dayOfWeek)

    @Query("SELECT s FROM ScheduleSlot s WHERE s.employee = :employee AND s.dayOfWeek = :dayOfWeek AND s.active = true ORDER BY s.startTime")
    List<ScheduleSlot> findByEmployeeAndDayOfWeekOrderByStartTime(@Param("employee") Employee employee, @Param("dayOfWeek") DayOfWeek dayOfWeek)

    @Query("""
        SELECT s FROM ScheduleSlot s 
        WHERE s.employee = :employee 
        AND s.dayOfWeek = :dayOfWeek 
        AND s.active = true 
        AND s.startTime < :endTime 
        AND s.endTime > :startTime
    """)
    List<ScheduleSlot> findConflictingSlots(
        @Param("employee") Employee employee,
        @Param("dayOfWeek") DayOfWeek dayOfWeek,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime
    )

    boolean existsByEmployeeAndDayOfWeekAndStartTimeAndEndTime(Employee employee, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime)

    @Query("SELECT s FROM ScheduleSlot s JOIN FETCH s.employee e JOIN FETCH e.user JOIN FETCH e.shop sh JOIN FETCH sh.owner WHERE s.id = :id")
    Optional<ScheduleSlot> findByIdWithEmployeeAndShop(@Param("id") UUID id)
}
