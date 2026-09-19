-- V1 基线：电商业务后端全部 19 张表的初始建表脚本。
-- 由实体类（com.ecommerce.entity.*）反推生成，替代 Hibernate 的 ddl-auto=update。
--
-- 约定：
--   1. 主键统一 BIGINT 自增（对应 @GeneratedValue(strategy = IDENTITY)）。
--   2. 金额/价格统一 DECIMAL(10,2)；带 precision=12,scale=2 的余额字段用 DECIMAL(12,2)。
--   3. 布尔用 TINYINT(1)，时间用 DATETIME，日期用 DATE。
--   4. 仅保留应用实际维护的两条外键（order_item、logistics_info → order_header），其余关系为逻辑引用。

-- ============ 商品域 ============

CREATE TABLE product (
    id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code           VARCHAR(255) NOT NULL,
    name           VARCHAR(255) NOT NULL,
    category       VARCHAR(255),
    description    VARCHAR(1000),
    price          DECIMAL(10,2),
    stock          INT,
    highlights     VARCHAR(255),
    active         TINYINT(1),
    returnable     TINYINT(1),
    after_sale_limit VARCHAR(255),
    scenario_tags  VARCHAR(255),
    image_url      VARCHAR(255),
    created_at     DATETIME,
    updated_at     DATETIME,
    CONSTRAINT uk_product_code UNIQUE (code)
);

CREATE TABLE product_promotion (
    id                   BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    product_id           BIGINT       NOT NULL,
    promotion_name       VARCHAR(255) NOT NULL,
    promotion_type       VARCHAR(255),
    discount_summary     VARCHAR(255),
    promotion_price      DECIMAL(10,2),
    required_member_level VARCHAR(255),
    condition_summary    VARCHAR(255),
    start_at             DATETIME,
    end_at               DATETIME,
    active               TINYINT(1)
);

-- ============ 用户域 ============

CREATE TABLE app_account (
    id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(255) NOT NULL,
    enabled       TINYINT(1)   NOT NULL,
    user_id       VARCHAR(255),
    created_at    DATETIME,
    updated_at    DATETIME,
    CONSTRAINT uk_app_account_username UNIQUE (username)
);

CREATE TABLE user_profile (
    id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id      VARCHAR(255) NOT NULL,
    nickname     VARCHAR(255),
    mobile       VARCHAR(255),
    member_level VARCHAR(255),
    risk_level   VARCHAR(255),
    CONSTRAINT uk_user_profile_user_id UNIQUE (user_id)
);

CREATE TABLE user_preference (
    id                   BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id              VARCHAR(255) NOT NULL,
    preferred_categories VARCHAR(255),
    preferred_delivery   VARCHAR(255),
    budget_min           DECIMAL(10,2),
    budget_max           DECIMAL(10,2),
    invoice_required     TINYINT(1),
    CONSTRAINT uk_user_preference_user_id UNIQUE (user_id)
);

CREATE TABLE user_coupon (
    id                   BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id              VARCHAR(255) NOT NULL,
    coupon_code          VARCHAR(255) NOT NULL,
    coupon_name          VARCHAR(255),
    coupon_type          VARCHAR(255),
    discount_amount      DECIMAL(10,2),
    threshold_amount     DECIMAL(10,2),
    applicable_categories VARCHAR(255),
    start_at             DATETIME,
    end_at               DATETIME,
    status               VARCHAR(255),
    CONSTRAINT uk_user_coupon_code UNIQUE (coupon_code)
);

-- ============ 订单域 ============

CREATE TABLE order_header (
    id                    BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_no              VARCHAR(255) NOT NULL,
    customer_name         VARCHAR(255),
    status                VARCHAR(255),
    payment_status        VARCHAR(255),
    total_amount          DECIMAL(10,2),
    created_at            DATETIME,
    user_id               VARCHAR(255),
    shipped_at            DATETIME,
    delivered_at          DATETIME,
    has_after_sale_request TINYINT(1),
    cancel_allowed        TINYINT(1),
    fulfillment_status    VARCHAR(255),
    logistics_no          VARCHAR(255),
    remark                VARCHAR(255),
    paid_at               DATETIME,
    CONSTRAINT uk_order_header_order_no UNIQUE (order_no)
);

CREATE TABLE order_item (
    id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id     BIGINT       NOT NULL,
    product_id   BIGINT,
    product_name VARCHAR(255),
    quantity     INT,
    unit_price   DECIMAL(10,2),
    CONSTRAINT fk_order_item_order_header FOREIGN KEY (order_id) REFERENCES order_header(id)
);

-- ============ 购物车 ============

CREATE TABLE cart_item (
    id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id    VARCHAR(255) NOT NULL,
    product_id BIGINT       NOT NULL,
    quantity   INT          NOT NULL,
    selected   TINYINT(1)   NOT NULL,
    created_at DATETIME,
    updated_at DATETIME
);

-- ============ 资金域 ============

CREATE TABLE balance_account (
    id                BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id           VARCHAR(255)  NOT NULL,
    available_balance DECIMAL(12,2) NOT NULL,
    created_at        DATETIME,
    updated_at        DATETIME,
    CONSTRAINT uk_balance_account_user_id UNIQUE (user_id)
);

CREATE TABLE balance_transaction (
    id             BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    transaction_no VARCHAR(255)  NOT NULL,
    user_id        VARCHAR(255)  NOT NULL,
    order_no       VARCHAR(255),
    after_sale_no  VARCHAR(255),
    type           VARCHAR(255)  NOT NULL,
    amount         DECIMAL(12,2) NOT NULL,
    balance_before DECIMAL(12,2) NOT NULL,
    balance_after  DECIMAL(12,2) NOT NULL,
    remark         VARCHAR(255),
    created_at     DATETIME,
    CONSTRAINT uk_balance_transaction_no UNIQUE (transaction_no)
);

-- ============ 售后/退款域 ============

CREATE TABLE refund_request (
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_id  VARCHAR(255) NOT NULL,
    order_no    VARCHAR(255),
    user_id     VARCHAR(255),
    amount      DECIMAL(10,2),
    reason      VARCHAR(255),
    status      VARCHAR(255),
    approval_id VARCHAR(255),
    created_at  DATETIME,
    updated_at  DATETIME,
    CONSTRAINT uk_refund_request_id UNIQUE (request_id)
);

CREATE TABLE after_sale_request (
    id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_id     VARCHAR(255) NOT NULL,
    order_no       VARCHAR(255),
    user_id        VARCHAR(255),
    request_type   VARCHAR(255),
    reason         VARCHAR(255),
    status         VARCHAR(255),
    amount         DECIMAL(10,2),
    user_confirmed TINYINT(1),
    approval_id    VARCHAR(255),
    created_at     DATETIME,
    updated_at     DATETIME,
    handling_note  VARCHAR(255),
    CONSTRAINT uk_after_sale_request_id UNIQUE (request_id)
);

CREATE TABLE after_sale_policy (
    id                     BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    scene_key              VARCHAR(255)  NOT NULL,
    title                  VARCHAR(255),
    content                VARCHAR(1500),
    eligibility            VARCHAR(255),
    applicable_conditions  VARCHAR(1000),
    exclusion_conditions   VARCHAR(1000),
    required_evidence      VARCHAR(255),
    requires_manual_review TINYINT(1),
    suggested_action       VARCHAR(255),
    policy_version         VARCHAR(255),
    CONSTRAINT uk_after_sale_policy_scene_key UNIQUE (scene_key)
);

-- ============ 审批域 ============

CREATE TABLE approval_request (
    id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    approval_id   VARCHAR(255) NOT NULL,
    business_type VARCHAR(255),
    business_id   VARCHAR(255),
    risk_level    VARCHAR(255),
    amount        DECIMAL(10,2),
    status        VARCHAR(255),
    operator      VARCHAR(255),
    comment       VARCHAR(255),
    created_at    DATETIME,
    approved_at   DATETIME,
    CONSTRAINT uk_approval_request_id UNIQUE (approval_id)
);

CREATE TABLE approval_record (
    id                 BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    approval_no        VARCHAR(255) NOT NULL,
    target_type        VARCHAR(255),
    target_no          VARCHAR(255),
    status             VARCHAR(255),
    reviewer_username  VARCHAR(255),
    review_note        VARCHAR(255),
    created_at         DATETIME,
    reviewed_at        DATETIME,
    CONSTRAINT uk_approval_record_no UNIQUE (approval_no)
);

-- ============ 物流域 ============

CREATE TABLE logistics_info (
    id                BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id          BIGINT       NOT NULL,
    company           VARCHAR(255),
    tracking_no       VARCHAR(255),
    status            VARCHAR(255),
    estimated_delivery DATE,
    latest_update     VARCHAR(255),
    delivered_at      DATETIME,
    exception_reason  VARCHAR(255),
    CONSTRAINT uk_logistics_info_order_id UNIQUE (order_id),
    CONSTRAINT fk_logistics_info_order_header FOREIGN KEY (order_id) REFERENCES order_header(id)
);

CREATE TABLE logistics_event (
    id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    logistics_id BIGINT       NOT NULL,
    occurred_at  DATETIME,
    content      VARCHAR(255)
);

-- ============ 知识域 ============

CREATE TABLE faq_entry (
    id       BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(255),
    question VARCHAR(255)  NOT NULL,
    answer   VARCHAR(1000)
);
