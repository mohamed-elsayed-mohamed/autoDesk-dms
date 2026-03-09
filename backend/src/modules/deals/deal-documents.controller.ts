import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { DealDocumentsService } from './deal-documents.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { RequestingUser } from './deals.service';

@Controller('api/deals/:dealId/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DealDocumentsController {
  constructor(private readonly documentsService: DealDocumentsService) {}

  @Post()
  @Roles(UserRole.SalesConsultant, UserRole.FniManager)
  @HttpCode(HttpStatus.CREATED)
  async generateDocument(
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @Body() dto: GenerateDocumentDto,
    @CurrentUser() actor: RequestingUser,
  ) {
    return this.documentsService.generateDocument(dealId, dto, actor);
  }

  @Get()
  async listDocuments(@Param('dealId', ParseUUIDPipe) dealId: string) {
    return this.documentsService.listDocuments(dealId);
  }

  @Get(':documentId/download')
  async getDownloadUrl(
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documentsService.getDownloadUrl(dealId, documentId);
  }
}
