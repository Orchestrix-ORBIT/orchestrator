package com.example.core_api.document;

import com.example.core_api.exception.ResourceNotFoundException;
import com.example.core_api.project.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private ProjectRepository  projectRepository;
    @InjectMocks private DocumentService documentService;

    private UUID projectId, documentId, authorId;
    private Document sampleDocument;

    @BeforeEach
    void setUp() {
        projectId  = UUID.randomUUID();
        documentId = UUID.randomUUID();
        authorId   = UUID.randomUUID();
        sampleDocument = Document.builder().id(documentId).projectId(projectId).authorId(authorId)
                .title("Meeting Notes Sprint 5").contentEncrypted("AES256_CIPHER").version(1).build();
    }

    @Test
    void createDocument_whenProjectExists_savesAndReturnsResponse() {
        when(projectRepository.existsById(projectId)).thenReturn(true);
        when(documentRepository.save(any(Document.class))).thenReturn(sampleDocument);
        CreateDocumentRequest req = new CreateDocumentRequest();
        req.setTitle("Meeting Notes Sprint 5");
        req.setContentEncrypted("AES256_CIPHER");
        DocumentResponse response = documentService.createDocument(projectId, authorId, req);
        assertThat(response.getId()).isEqualTo(documentId);
        assertThat(response.getTitle()).isEqualTo("Meeting Notes Sprint 5");
        verify(documentRepository).save(any(Document.class));
    }

    @Test
    void createDocument_whenProjectDoesNotExist_throwsResourceNotFoundException() {
        when(projectRepository.existsById(projectId)).thenReturn(false);
        CreateDocumentRequest req = new CreateDocumentRequest();
        req.setTitle("Orphan");
        assertThatThrownBy(() -> documentService.createDocument(projectId, authorId, req))
                .isInstanceOf(ResourceNotFoundException.class).hasMessageContaining(projectId.toString());
        verify(documentRepository, never()).save(any());
    }

    @Test
    void getDocumentsByProject_returnsMappedList() {
        when(documentRepository.findAllByProjectId(projectId)).thenReturn(List.of(sampleDocument));
        List<DocumentResponse> results = documentService.getDocumentsByProject(projectId);
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getTitle()).isEqualTo("Meeting Notes Sprint 5");
    }

    @Test
    void getDocumentsByProject_whenNoneExist_returnsEmptyList() {
        when(documentRepository.findAllByProjectId(projectId)).thenReturn(List.of());
        assertThat(documentService.getDocumentsByProject(projectId)).isEmpty();
    }

    @Test
    void getDocumentById_whenFound_returnsMappedResponse() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(sampleDocument));
        assertThat(documentService.getDocumentById(documentId).getTitle()).isEqualTo("Meeting Notes Sprint 5");
    }

    @Test
    void getDocumentById_whenNotFound_throwsResourceNotFoundException() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> documentService.getDocumentById(documentId))
                .isInstanceOf(ResourceNotFoundException.class).hasMessageContaining(documentId.toString());
    }

    @Test
    void updateDocument_withNewTitle_updatesTitleOnly() {
        when(documentRepository.existsByIdAndProjectId(documentId, projectId)).thenReturn(true);
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(sampleDocument));
        Document updated = Document.builder().id(documentId).projectId(projectId).authorId(authorId)
                .title("Updated Title").contentEncrypted("AES256_CIPHER").version(1).build();
        when(documentRepository.save(any())).thenReturn(updated);
        UpdateDocumentRequest req = new UpdateDocumentRequest();
        req.setTitle("Updated Title");
        assertThat(documentService.updateDocument(projectId, documentId, req).getTitle()).isEqualTo("Updated Title");
    }

    @Test
    void updateDocument_withNewContent_bumpsVersion() {
        when(documentRepository.existsByIdAndProjectId(documentId, projectId)).thenReturn(true);
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(sampleDocument));
        Document updated = Document.builder().id(documentId).projectId(projectId).authorId(authorId)
                .title("Meeting Notes Sprint 5").contentEncrypted("NEW_CIPHER").version(2).build();
        when(documentRepository.save(any())).thenReturn(updated);
        UpdateDocumentRequest req = new UpdateDocumentRequest();
        req.setContentEncrypted("NEW_CIPHER");
        assertThat(documentService.updateDocument(projectId, documentId, req).getVersion()).isEqualTo(2);
    }

    @Test
    void updateDocument_whenDocumentNotInProject_throwsResourceNotFoundException() {
        when(documentRepository.existsByIdAndProjectId(documentId, projectId)).thenReturn(false);
        UpdateDocumentRequest req = new UpdateDocumentRequest();
        req.setTitle("Unauthorized");
        assertThatThrownBy(() -> documentService.updateDocument(projectId, documentId, req))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(documentId.toString()).hasMessageContaining(projectId.toString());
        verify(documentRepository, never()).save(any());
    }

    @Test
    void deleteDocument_whenFound_deletesSuccessfully() {
        when(documentRepository.existsByIdAndProjectId(documentId, projectId)).thenReturn(true);
        documentService.deleteDocument(projectId, documentId);
        verify(documentRepository).deleteById(documentId);
    }

    @Test
    void deleteDocument_whenNotInProject_throwsResourceNotFoundException() {
        when(documentRepository.existsByIdAndProjectId(documentId, projectId)).thenReturn(false);
        assertThatThrownBy(() -> documentService.deleteDocument(projectId, documentId))
                .isInstanceOf(ResourceNotFoundException.class).hasMessageContaining(documentId.toString());
        verify(documentRepository, never()).deleteById(any());
    }
}
