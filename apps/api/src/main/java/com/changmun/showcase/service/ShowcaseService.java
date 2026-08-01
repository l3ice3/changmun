package com.changmun.showcase.service;

import com.changmun.common.web.NotFoundException;
import com.changmun.showcase.domain.ShowcaseCategory;
import com.changmun.showcase.domain.ShowcaseContent;
import com.changmun.showcase.domain.ShowcaseProduct;
import com.changmun.showcase.domain.ShowcaseSort;
import com.changmun.showcase.dto.ShowcaseCardResponse;
import com.changmun.showcase.dto.ShowcaseEditViewResponse;
import com.changmun.showcase.dto.ShowcaseForm;
import com.changmun.showcase.dto.ShowcaseImageResponse;
import com.changmun.showcase.dto.ShowcaseListResponse;
import com.changmun.showcase.dto.ShowcaseMineResponse;
import com.changmun.showcase.repository.ShowcaseCardRow;
import com.changmun.showcase.repository.ShowcaseMineRow;
import com.changmun.showcase.repository.ShowcaseProductRepository;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 쇼케이스 제품 유스케이스 — 등록/수정/삭제(본인)·리스트/주간(승인작만)·이미지 서빙. */
@Service
public class ShowcaseService {

  private static final int WEEKLY_LIMIT = 6;

  private final ShowcaseProductRepository repository;
  private final ShowcaseFormValidator validator;

  public ShowcaseService(ShowcaseProductRepository repository, ShowcaseFormValidator validator) {
    this.repository = repository;
    this.validator = validator;
  }

  @Transactional
  public Long register(Long userId, ShowcaseForm form) {
    ShowcaseContent content = validator.validate(form);
    ShowcaseProduct product = ShowcaseProduct.register(content, userId);
    return repository.save(product).getId();
  }

  @Transactional
  public void edit(Long userId, Long productId, ShowcaseForm form) {
    ShowcaseContent content = validator.validate(form);
    ShowcaseProduct product = findOwned(userId, productId);
    product.edit(content);
    repository.save(product);
  }

  @Transactional
  public void remove(Long userId, Long productId) {
    ShowcaseProduct product = findOwned(userId, productId);
    repository.delete(product);
  }

  @Transactional(readOnly = true)
  public ShowcaseListResponse list(String category, String sort, Pageable pageable) {
    String categoryFilter = normalizeCategory(category);
    Page<ShowcaseCardRow> found = pageOf(categoryFilter, ShowcaseSort.from(sort), pageable);
    List<ShowcaseCardResponse> items = found.getContent().stream().map(this::toCard).toList();
    return ShowcaseListResponse.of(items, found);
  }

  @Transactional(readOnly = true)
  public List<ShowcaseCardResponse> weekly() {
    return repository.listWeekly(PageRequest.of(0, WEEKLY_LIMIT)).stream()
        .map(this::toCard)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<ShowcaseMineResponse> mine(Long userId) {
    return repository.listMine(userId).stream().map(this::toMine).toList();
  }

  @Transactional(readOnly = true)
  public ShowcaseProduct findApproved(Long productId) {
    ShowcaseProduct product =
        repository
            .findById(productId)
            .orElseThrow(() -> new NotFoundException("제품을 찾을 수 없습니다: " + productId));
    if (!product.isApproved()) {
      throw new NotFoundException("제품을 찾을 수 없습니다: " + productId);
    }
    return product;
  }

  /** 소유자 편집용 조회 — 검수 상태와 무관하게 본인 제품이면 반환(그 외 404). */
  @Transactional(readOnly = true)
  public ShowcaseEditViewResponse editView(Long userId, Long productId) {
    return ShowcaseEditViewResponse.from(findOwned(userId, productId));
  }

  @Transactional(readOnly = true)
  public ShowcaseImageResponse image(Long productId) {
    ShowcaseProduct product = findApproved(productId);
    if (!product.hasImage()) {
      throw new NotFoundException("등록된 이미지가 없습니다: " + productId);
    }
    return new ShowcaseImageResponse(product.getImage(), product.getImageType());
  }

  private ShowcaseProduct findOwned(Long userId, Long productId) {
    return repository
        .findByIdAndOwnerUserId(productId, userId)
        .orElseThrow(() -> new NotFoundException("등록한 제품을 찾을 수 없습니다: " + productId));
  }

  private Page<ShowcaseCardRow> pageOf(String category, ShowcaseSort order, Pageable pageable) {
    if (order == ShowcaseSort.CHEERS) {
      return repository.listCheered(category, pageable);
    }
    return repository.listLatest(category, pageable);
  }

  private ShowcaseCardResponse toCard(ShowcaseCardRow row) {
    return new ShowcaseCardResponse(
        row.getId(),
        row.getName(),
        row.getTagline(),
        row.getCategory(),
        row.getMakerName(),
        row.getCheerCount(),
        row.getHasImage(),
        row.getApprovedAt());
  }

  private ShowcaseMineResponse toMine(ShowcaseMineRow row) {
    return new ShowcaseMineResponse(
        row.getId(),
        row.getName(),
        row.getTagline(),
        row.getCategory(),
        row.getStatus(),
        row.getRejectReason(),
        row.getCheerCount(),
        row.getCreatedAt());
  }

  private String normalizeCategory(String category) {
    if (category == null || category.isBlank()) {
      return null;
    }
    return ShowcaseCategory.from(category).name();
  }
}
