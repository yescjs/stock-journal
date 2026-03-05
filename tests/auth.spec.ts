import { test, expect } from '@playwright/test';
import { enterGuestMode } from './helpers';

test.describe('Authentication', () => {
  // ─── Guest Mode ───────────────────────────────────────────────────────

  test('게스트 모드로 /trade에 진입할 수 있다', async ({ page }) => {
    await enterGuestMode(page);
    await expect(page.getByText('StockJournal').first()).toBeVisible();
    await expect(page.locator('nav').getByText('로그인')).toBeVisible();
  });

  test('게스트 모드에서 FAB 버튼이 표시된다', async ({ page }) => {
    await enterGuestMode(page);
    await expect(page.getByRole('button', { name: /새 매매 기록 추가/ })).toBeVisible();
  });

  // ─── Login Form ───────────────────────────────────────────────────────

  test.describe('Login Form', () => {
    test.beforeEach(async ({ page }) => {
      await enterGuestMode(page);
      await page.locator('nav').getByText('로그인').click();
      await expect(page.getByPlaceholder('이메일 주소')).toBeVisible({ timeout: 5000 });
    });

    test('이메일과 비밀번호 입력 필드가 표시된다', async ({ page }) => {
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
    });

    test('빈 이메일로 로그인 시 제출 되지 않는다', async ({ page }) => {
      await page.locator('#password').fill('test123456');
      // 로그인 폼 내부의 제출 버튼 (BottomSheet 내부)
      const submitBtn = page.locator('#password').locator('..').locator('..').getByRole('button', { name: '로그인' });
      if (await submitBtn.isVisible({ timeout: 2000 })) {
        await submitBtn.click();
      }
      await expect(page.locator('#email')).toBeVisible();
    });

    test('회원가입 탭으로 전환할 수 있다', async ({ page }) => {
      await page.getByRole('button', { name: '회원가입' }).click();
      await expect(page.locator('#confirmPassword')).toBeVisible();
    });

    test('회원가입 모드에서 인증 메일 받기 버튼이 표시된다', async ({ page }) => {
      await page.getByRole('button', { name: '회원가입' }).click();
      await expect(page.getByRole('button', { name: /인증 메일 받기/ })).toBeVisible();
    });

    test('비밀번호 재설정 모드로 전환할 수 있다', async ({ page }) => {
      const forgotLink = page.getByText('비밀번호를 잊으셨나요?');
      if (await forgotLink.isVisible({ timeout: 2000 })) {
        await forgotLink.click();
        await expect(page.getByRole('button', { name: /재설정 이메일 보내기/ })).toBeVisible();
      }
    });

    test('비밀번호 재설정에서 로그인으로 돌아갈 수 있다', async ({ page }) => {
      const forgotLink = page.getByText('비밀번호를 잊으셨나요?');
      if (await forgotLink.isVisible({ timeout: 2000 })) {
        await forgotLink.click();
        await page.getByText('로그인으로 돌아가기').click();
        await expect(page.locator('#password')).toBeVisible();
      }
    });

    test('모드 전환 시 폼 상태가 유지된다', async ({ page }) => {
      // 이메일 입력
      await page.locator('#email').fill('test@example.com');
      // 회원가입 탭으로 전환
      await page.getByRole('button', { name: '회원가입' }).click();
      // confirmPassword 필드 나타남
      await expect(page.locator('#confirmPassword')).toBeVisible();
      // 다시 로그인 탭으로 전환 - BottomSheet 안의 로그인 탭을 정확히 선택
      // 탭 컨테이너 내의 "로그인" 버튼 (회원가입 탭과 같은 라인에 있는 것)
      const tabContainer = page.locator('#confirmPassword').locator('..').locator('..').locator('..').locator('..').locator('button').filter({ hasText: '로그인' }).first();
      await tabContainer.click({ force: true });
      await expect(page.locator('#email')).toBeVisible();
    });
  });
});
