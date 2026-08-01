package com.changmun.showcase.service;

import com.changmun.common.web.NotFoundException;
import com.changmun.showcase.domain.ShowcaseCheer;
import com.changmun.showcase.domain.ShowcaseCheerId;
import com.changmun.showcase.domain.ShowcaseComment;
import com.changmun.showcase.domain.ShowcaseProduct;
import com.changmun.showcase.dto.ShowcaseCheerResponse;
import com.changmun.showcase.dto.ShowcaseCommentResponse;
import com.changmun.showcase.dto.ShowcaseDetailResponse;
import com.changmun.showcase.dto.ShowcaseReactions;
import com.changmun.showcase.repository.ShowcaseCheerRepository;
import com.changmun.showcase.repository.ShowcaseCommentRepository;
import com.changmun.showcase.repository.ShowcaseCommentRow;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 쇼케이스 반응 유스케이스 — 상세 조립·응원 토글·댓글 작성/삭제. 대상 제품은 승인작만. */
@Service
public class ShowcaseReactionService {

  private static final int MASK_VISIBLE_PREFIX = 2;

  private final ShowcaseService showcaseService;
  private final ShowcaseCheerRepository cheerRepository;
  private final ShowcaseCommentRepository commentRepository;

  public ShowcaseReactionService(
      ShowcaseService showcaseService,
      ShowcaseCheerRepository cheerRepository,
      ShowcaseCommentRepository commentRepository) {
    this.showcaseService = showcaseService;
    this.cheerRepository = cheerRepository;
    this.commentRepository = commentRepository;
  }

  @Transactional(readOnly = true)
  public ShowcaseDetailResponse detail(Long productId, Long viewerUserId) {
    ShowcaseProduct product = showcaseService.findApproved(productId);
    ShowcaseReactions reactions = reactionsOf(product, viewerUserId);
    List<ShowcaseCommentResponse> comments =
        commentRepository.listVisible(productId).stream()
            .map(row -> toComment(row, viewerUserId))
            .toList();
    return ShowcaseDetailResponse.from(product, reactions, comments);
  }

  @Transactional
  public ShowcaseCheerResponse toggleCheer(Long productId, Long userId) {
    showcaseService.findApproved(productId);
    ShowcaseCheerId cheerId = new ShowcaseCheerId(productId, userId);
    boolean cheered = !cheerRepository.existsById(cheerId);
    applyCheer(cheerId, productId, userId, cheered);
    return new ShowcaseCheerResponse(cheered, cheerRepository.countByIdProductId(productId));
  }

  @Transactional
  public Long addComment(Long productId, Long userId, String body) {
    showcaseService.findApproved(productId);
    ShowcaseComment comment = ShowcaseComment.write(productId, userId, body.strip());
    return commentRepository.save(comment).getId();
  }

  @Transactional
  public void removeComment(Long commentId, Long userId) {
    ShowcaseComment comment =
        commentRepository
            .findById(commentId)
            .orElseThrow(() -> new NotFoundException("댓글을 찾을 수 없습니다: " + commentId));
    comment.softDeleteBy(userId);
    commentRepository.save(comment);
  }

  private ShowcaseReactions reactionsOf(ShowcaseProduct product, Long viewerUserId) {
    long cheers = cheerRepository.countByIdProductId(product.getId());
    if (viewerUserId == null) {
      return new ShowcaseReactions(cheers, false, false);
    }
    boolean cheeredByMe =
        cheerRepository.existsById(new ShowcaseCheerId(product.getId(), viewerUserId));
    boolean mine = product.getOwnerUserId().equals(viewerUserId);
    return new ShowcaseReactions(cheers, cheeredByMe, mine);
  }

  private void applyCheer(ShowcaseCheerId cheerId, Long productId, Long userId, boolean cheered) {
    if (cheered) {
      cheerRepository.save(ShowcaseCheer.of(productId, userId));
      return;
    }
    cheerRepository.deleteById(cheerId);
  }

  private ShowcaseCommentResponse toComment(ShowcaseCommentRow row, Long viewerUserId) {
    return new ShowcaseCommentResponse(
        row.getId(),
        maskDisplayName(row.getEmailLocalPart()),
        row.getBody(),
        row.getUserId().equals(viewerUserId),
        row.getCreatedAt());
  }

  private String maskDisplayName(String localPart) {
    if (localPart == null || localPart.length() <= MASK_VISIBLE_PREFIX) {
      return localPart + "***";
    }
    return localPart.substring(0, MASK_VISIBLE_PREFIX) + "***";
  }
}
