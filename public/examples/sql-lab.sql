-- IT Basic / Notes & Interview / PostgreSQL lab
-- Chạy toàn bộ script trong một session thử nghiệm.
-- Chỉ dùng TEMP TABLE, cuối script ROLLBACK. Không sửa bảng hiện có.
BEGIN;
CREATE TEMP TABLE ni_employees (
 id integer PRIMARY KEY, department text NOT NULL,
 salary numeric, active boolean NOT NULL DEFAULT true
) ON COMMIT DROP;
INSERT INTO ni_employees VALUES
 (1,'Dev',100,true),(2,'Dev',100,true),(3,'Dev',90,true),
 (4,'Ops',80,true),(5,'Ops',NULL,false);

-- 1. COUNT(*) khác COUNT(salary).
-- Kỳ vọng: total=5, with_salary=4, avg_salary=92.5.
SELECT COUNT(*) AS total, COUNT(salary) AS with_salary, AVG(salary) AS avg_salary
FROM ni_employees;

-- 2. Top 2 mức lương mỗi phòng, không lấy NULL.
-- Kỳ vọng ID: 1,2,3,4. DENSE_RANK giữ cả hai người cùng lương 100.
WITH ranked AS (
 SELECT *, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS r
 FROM ni_employees WHERE salary IS NOT NULL
)
SELECT id,department,salary FROM ranked
WHERE r<=2 ORDER BY department,salary DESC,id;

-- 3. Top 2 hàng mỗi phòng; ID làm tie-breaker.
-- Kỳ vọng ID: 1,2,4. Khác yêu cầu top 2 mức lương ở trên.
WITH ranked AS (
 SELECT *, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC,id) AS rn
 FROM ni_employees WHERE salary IS NOT NULL
)
SELECT id,department,salary FROM ranked WHERE rn<=2 ORDER BY department,rn;

CREATE TEMP TABLE ni_customers(id integer PRIMARY KEY,name text NOT NULL) ON COMMIT DROP;
CREATE TEMP TABLE ni_orders (
 id integer PRIMARY KEY, customer_id integer REFERENCES ni_customers(id),
 status text NOT NULL, amount numeric NOT NULL, created_at timestamptz NOT NULL
) ON COMMIT DROP;
INSERT INTO ni_customers VALUES (1,'An'),(2,'Bình'),(3,'Chi');
INSERT INTO ni_orders VALUES
 (10,1,'paid',100,'2026-01-01T08:00:00Z'),
 (11,1,'pending',200,'2026-01-01T09:00:00Z'),
 (12,3,'paid',50,'2026-01-02T08:00:00Z');

-- 4. Giữ mọi khách, chỉ nối đơn paid.
-- Kỳ vọng: (1,10), (2,NULL), (3,12).
SELECT c.id AS customer_id,o.id AS order_id
FROM ni_customers c
LEFT JOIN ni_orders o ON o.customer_id=c.id AND o.status='paid'
ORDER BY c.id,o.id;

-- 5. Khách chưa có bất kỳ đơn nào: chỉ Bình (id=2).
SELECT c.id,c.name FROM ni_customers c
WHERE NOT EXISTS (SELECT 1 FROM ni_orders o WHERE o.customer_id=c.id)
ORDER BY c.id;

-- 6. Running total theo thứ tự xác định, tất cả trạng thái để minh họa.
-- Kỳ vọng: (10,100), (11,300), (12,350).
SELECT id,SUM(amount) OVER (
 ORDER BY created_at,id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) AS running_total FROM ni_orders ORDER BY created_at,id;

-- 7. Aggregate trước rồi lấy tháng có dữ liệu trước đó bằng LAG.
-- Nếu cần đúng tháng lịch trước, phải bổ sung calendar cho tháng trống.
WITH monthly AS (
 SELECT DATE_TRUNC('month',created_at AT TIME ZONE 'UTC') AS month,SUM(amount) AS revenue
 FROM ni_orders WHERE status='paid' GROUP BY 1
), comparison AS (
 SELECT *,LAG(revenue) OVER (ORDER BY month) AS previous FROM monthly
)
SELECT month,revenue,(revenue-previous)*100.0/NULLIF(previous,0) AS growth_pct
FROM comparison ORDER BY month;

ROLLBACK;
