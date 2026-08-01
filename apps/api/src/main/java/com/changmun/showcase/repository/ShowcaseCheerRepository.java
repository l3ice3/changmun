package com.changmun.showcase.repository;

import com.changmun.showcase.domain.ShowcaseCheer;
import com.changmun.showcase.domain.ShowcaseCheerId;
import org.springframework.data.jpa.repository.JpaRepository;

/** 쇼케이스 응원 — 복합 PK(product_id, user_id)로 존재/추가/삭제만 다룬다(토글은 서비스). */
public interface ShowcaseCheerRepository extends JpaRepository<ShowcaseCheer, ShowcaseCheerId> {

  long countByIdProductId(Long productId);
}
